param (
    [string]$ConfigPath = "$PSScriptRoot\config.json",
    [switch]$Once
)

# Force 32-bit execution if running in 64-bit PowerShell (zkemkeeper is 32-bit COM)
if ([Environment]::Is64BitProcess) {
    $sysWow64Ps = "$env:WINDIR\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
    if (Test-Path $sysWow64Ps) {
        Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Switching to 32-bit PowerShell for ZKTeco driver..."
        $scriptArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"")
        if ($Once) { $scriptArgs += "-Once" }
        & $sysWow64Ps $scriptArgs
        exit $LASTEXITCODE
    }
}

if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config file not found: $ConfigPath"
    exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$deviceIp = $config.deviceIp
$devicePort = if ($config.devicePort) { [int]$config.devicePort } else { 4370 }
$apiUrl = $config.apiUrl
$apiSecret = $config.apiSecret
$intervalMinutes = if ($config.syncIntervalMinutes) { [int]$config.syncIntervalMinutes } else { 2 }

function Sync-AttendancePunches {
    $punches = [System.Collections.Generic.List[hashtable]]::new()
    $connected = $false
    $zk = $null

    # 1. Try Direct Hardware Connection to Biometric Device (192.168.10.57:4370)
    try {
        Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Connecting to Biometric Machine (${deviceIp}:${devicePort})..."
        $zk = New-Object -ComObject zkemkeeper.ZKEM
        # Set 3 second connection timeout
        $connected = $zk.Connect_Net($deviceIp, $devicePort)
    } catch {
        Write-Output "[WARN] COM error: $($_.Exception.Message)"
    }

    if ($connected) {
        Write-Output "[OK] Connected to machine! Reading logs from device..."
        $machineNumber = 1
        
        # Crucial for ZKTeco: pause device UI while reading buffer to prevent socket packet drops
        try { $zk.EnableDevice($machineNumber, $false) } catch {}

        # First try ReadTimeGLogData for current month to avoid reading full multi-year buffer
        $readSuccess = $false
        try {
            $nowStr = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            $readSuccess = $zk.ReadTimeGLogData($machineNumber, "2026-10-01 00:00:00", $nowStr)
        } catch {}

        if (-not $readSuccess) {
            # Fallback to ReadGeneralLogData
            try {
                $readSuccess = $zk.ReadGeneralLogData($machineNumber)
            } catch {}
        }

        $enrollNumber = ""
        $verifyMode = 0
        $inOutMode = 0
        $year = 0
        $month = 0
        $day = 0
        $hour = 0
        $minute = 0
        $second = 0
        $workCode = 0

        while ($zk.SSR_GetGeneralLogData($machineNumber, [ref]$enrollNumber, [ref]$verifyMode, [ref]$inOutMode, [ref]$year, [ref]$month, [ref]$day, [ref]$hour, [ref]$minute, [ref]$second, [ref]$workCode)) {
            if ($year -gt 2020) {
                $fMonth = "{0:D2}" -f $month
                $fDay = "{0:D2}" -f $day
                $fHour = "{0:D2}" -f $hour
                $fMin = "{0:D2}" -f $minute
                $fSec = "{0:D2}" -f $second

                $punches.Add(@{
                    enrollNumber = [string]$enrollNumber
                    timestamp = "$year-$fMonth-$fDay ${fHour}:${fMin}:${fSec}"
                })
            }
        }

        # Re-enable device and disconnect
        try { $zk.EnableDevice($machineNumber, $true) } catch {}
        $zk.Disconnect()

        Write-Output "[OK] Extracted $($punches.Count) punches directly from hardware device."
    }

    # 2. If hardware returned 0 or socket gave error, read local dump files
    if ($punches.Count -eq 0) {
        Write-Output "[INFO] Reading local biometric dump files..."
        $files = Get-ChildItem -Path "C:\ProgramData\KekaSyncTool" -Filter "*.dat" -Recurse -ErrorAction SilentlyContinue
        if ($files) {
            Write-Output "Found $($files.Count) local dump files. Parsing..."
            foreach ($file in $files) {
                $lines = Get-Content $file.FullName
                foreach ($line in $lines) {
                    $parts = $line.Trim() -split '\s+'
                    if ($parts.Count -ge 3) {
                        $enroll = $parts[0]
                        $rawDate = $parts[1]
                        $rawTime = $parts[2]

                        $dparts = $rawDate -split '[\/\-\.]'
                        if ($dparts.Count -eq 3 -and $rawTime -match '^\d{2}:\d{2}:\d{2}$') {
                            if ($dparts[2].Length -eq 4) {
                                $y = $dparts[2]
                                $m = $dparts[1].PadLeft(2, '0')
                                $d = $dparts[0].PadLeft(2, '0')
                            } else {
                                $y = $dparts[0]
                                $m = $dparts[1].PadLeft(2, '0')
                                $d = $dparts[2].PadLeft(2, '0')
                            }
                            $punches.Add(@{
                                enrollNumber = [string]$enroll
                                timestamp = "$y-$m-$d $rawTime"
                            })
                        }
                    }
                }
            }
            Write-Output "[OK] Extracted $($punches.Count) punches from local dump files."
        }
    }

    if ($punches.Count -gt 0) {
        $batchSize = 2500
        $totalBatches = [Math]::Ceiling($punches.Count / $batchSize)

        for ($b = 0; $b -lt $totalBatches; $b++) {
            $start = $b * $batchSize
            $count = [Math]::Min($batchSize, $punches.Count - $start)
            $batchPunches = $punches.GetRange($start, $count)

            $body = @{
                apiKey = $apiSecret
                punches = $batchPunches
            } | ConvertTo-Json -Depth 5

            $headers = @{
                "Content-Type" = "application/json"
                "x-biometric-secret" = $apiSecret
            }

            try {
                Write-Output "Uploading Batch $($b + 1) of $totalBatches ($count punches) to HRMS Cloud..."
                $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -Headers $headers -TimeoutSec 120
                Write-Output "Batch $($b + 1) Status: $($response.message)"
            } catch {
                Write-Output "[ERROR] Upload failed for batch $($b + 1): $($_.Exception.Message)"
            }
        }
        Write-Output "[SUCCESS] All biometric punches synced to HRMS at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')!"
    } else {
        Write-Output "[WARN] No punches found to sync."
    }
}

if ($Once) {
    Sync-AttendancePunches
    exit 0
}

# Continuous loop for background service
while ($true) {
    try {
        Sync-AttendancePunches
    } catch {
        Write-Output "[ERROR] Sync error: $($_.Exception.Message)"
    }
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Sleeping for $intervalMinutes minutes until next auto-sync..."
    Start-Sleep -Seconds ($intervalMinutes * 60)
}
