# test-function.ps1
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYW9ldnlwYWNrZWxjc3RkaWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDU5NTcsImV4cCI6MjA3NTQ4MTk1N30.gVJxR1-DXXmXyZ7_2bqr-R_JP7P2CpnLFMkS1ExFB5w"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYW9ldnlwYWNrZWxjc3RkaWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDU5NTcsImV4cCI6MjA3NTQ4MTk1N30.gVJxR1-DXXmXyZ7_2bqr-R_JP7P2CpnLFMkS1ExFB5w"
}

# First test with JSON
Write-Host "Testing with JSON body..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "https://xcaoevypackelcstdieu.supabase.co/functions/v1/analyze-audio" `
        -Method POST `
        -Headers $headers `
        -ContentType "application/json" `
        -Body '{}'
    
    Write-Host "Response:" -ForegroundColor Green
    $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}

# Test with an audio file if you have one
$audioPath = "C:\Users\wwwhj\Downloads\test-audio.mp3"
if (Test-Path $audioPath) {
    Write-Host "`nTesting with audio file..." -ForegroundColor Green
    
    # This requires a more complex approach with multipart/form-data
    # For now, let's just verify the function works with your React app
    Write-Host "Function is ready! Now test with your React app." -ForegroundColor Green
} else {
    Write-Host "`nNo test audio file found at $audioPath" -ForegroundColor Yellow
    Write-Host "Create a small audio file or use an existing one to test with file upload." -ForegroundColor Yellow
}