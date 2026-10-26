# ==============================================================================
# Idea-Fueled HRMS - Biometric Hardware Sync Agent (PowerShell Native)
# ==============================================================================
# Connects directly to office eSSL / ZKTeco machine over LAN,
# extracts punch logs, and syncs to HRMS Cloud Backend.
# No Keka needed. Runs completely standalone as a Windows Service.
# ==============================================================================

param (
    [string]$ConfigPath = "$PSScriptRoot\config.json"
)

if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config file not found: $ConfigPath"
    exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$deviceIp = $config.deviceIp
$devicePort = [int]$config.devicePort
$apiUrl = $config.apiUrl
$apiSecret = $config.apiSecret
$intervalSeconds = [int]$config.syncIntervalMinutes * 60

Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Idea-Fueled Biometric Agent Started."
Write-Output "Target Machine: ${deviceIp}:${devicePort} | Sync Interval: $($config.syncIntervalMinutes) minutes"

function Sync-Attendance {
    try {
        Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Connecting to biometric device (${deviceIp}:${devicePort})..."
        
        $zk = New-Object -ComObject "zkemkeeper.ZKEM"
        $connected = $zk.Connect_Net($deviceIp, $devicePort)

        if (-not $connected) {
            Write-Warning "Could not connect to biometric machine at ${deviceIp}:${devicePort}. Will retry in next cycle."
            return
        }

        Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Connected successfully. Reading logs from machine memory..."
        $zk.RegEvent(1, 65535) | Out-Null
        $zk.ReadGeneralLogData(1) | Out-Null

        $dwEnrollNumber = ""
        $dwVerifyMode = 0
        $dwInOutMode = 0
        $dwYear = 0
        $dwMonth = 0
        $dwDay = 0
        $dwHour = 0
        $dwMinute = 0
        $dwSecond = 0
        $dwWorkCode = 0

        $punches = @()

        while ($zk.SSR_GetGeneralLogData(1, [ref]$dwEnrollNumber, [ref]$dwVerifyMode, [ref]$dwInOutMode, [ref]$dwYear, [ref]$dwMonth, [ref]$dwDay, [ref]$dwHour, [ref]$dwMinute, [ref]$dwSecond, [ref]$dwWorkCode)) {
            $formattedMonth = "{0:D2}" -f $dwMonth
            $formattedDay = "{0:D2}" -f $dwDay
            $formattedHour = "{0:D2}" -f $dwHour
            $formattedMin = "{0:D2}" -f $dwMinute
            $formattedSec = "{0:D2}" -f $dwSecond

            $timestamp = "$dwYear-$formattedMonth-$formattedDay ${formattedHour}:${formattedMin}:${formattedSec}"

            $punches += @{
                enrollNumber = [string]$dwEnrollNumber
                timestamp = $timestamp
                inOutMode = $dwInOutMode
            }
        }

        $zk.Disconnect()
        Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Successfully fetched $($punches.Count) punches from device."

        if ($punches.Count -gt 0) {
            $body = @{
                apiKey = $apiSecret
                punches = $punches
            } | ConvertTo-Json -Depth 5

            $headers = @{
                "Content-Type" = "application/json"
                "x-biometric-secret" = $apiSecret
            }

            Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Uploading to HRMS Backend ($apiUrl)..."
            $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -Headers $headers -TimeoutSec 60
            Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Sync Success: $($response.message)"
        }
    }
    catch {
        Write-Error "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Sync failed with error: $_"
    }
}

# Continuous Background Loop
while ($true) {
    Sync-Attendance
    Start-Sleep -Seconds $intervalSeconds
}
