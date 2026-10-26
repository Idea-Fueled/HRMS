param (
    [string]$ConfigPath = "$PSScriptRoot\config.json"
)

if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config file not found: $ConfigPath"
    exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$apiUrl = $config.apiUrl
$apiSecret = $config.apiSecret

Write-Output "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Reading local biometric punch dump..."

$punches = [System.Collections.Generic.List[hashtable]]::new()

$files = Get-ChildItem -Path "C:\ProgramData\KekaSyncTool" -Filter "*.dat" -Recurse -ErrorAction SilentlyContinue
Write-Output "Found $($files.Count) log dump files. Processing punches with correct DD-MM-YYYY format..."

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
                # Format: DD-MM-YYYY
                # dparts[0] = Day (e.g. 23)
                # dparts[1] = Month (e.g. 10)
                # dparts[2] = Year (e.g. 2026)
                if ($dparts[2].Length -eq 4) {
                    $year = $dparts[2]
                    $month = $dparts[1].PadLeft(2, '0')
                    $day = $dparts[0].PadLeft(2, '0')
                } else {
                    $year = $dparts[0]
                    $month = $dparts[1].PadLeft(2, '0')
                    $day = $dparts[2].PadLeft(2, '0')
                }

                $isoDate = "$year-$month-$day"

                $punches.Add(@{
                    enrollNumber = [string]$enroll
                    timestamp = "$isoDate $rawTime"
                })
            }
        }
    }
}

Write-Output "Successfully extracted $($punches.Count) punches!"

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

        Write-Output "Uploading Batch $($b + 1) of $totalBatches ($count punches) to HRMS..."
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -Headers $headers -TimeoutSec 120
        Write-Output "Batch $($b + 1) Response: $($response.message)"
    }
    Write-Output "ALL HISTORICAL ATTENDANCE SYNCED SUCCESSFULLY TO HRMS!"
}
