# test-heroku.ps1  -  Bước 4: Test toàn bộ hệ thống trên Heroku (Windows PowerShell)
# Cách chạy:
#   powershell -ExecutionPolicy Bypass -File .\test-heroku.ps1 -GatewayUrl https://<ten-app>-xxxx.herokuapp.com
param(
    [Parameter(Mandatory = $true)][string]$GatewayUrl
)
$GatewayUrl = $GatewayUrl.TrimEnd('/')
$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8

function Show($title, $scriptBlock) {
    Write-Host "`n===== $title =====" -ForegroundColor Cyan
    try {
        $result = & $scriptBlock
        Write-Host ($result | ConvertTo-Json -Depth 6)
        return $result
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP $code : $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host "Gateway: $GatewayUrl" -ForegroundColor Green
Write-Host "(Lan goi dau co the cham 5-20 giay vi dyno Eco dang 'ngu')" -ForegroundColor DarkGray

Show "Testing API Gateway" { Invoke-RestMethod "$GatewayUrl/" -TimeoutSec 60 } | Out-Null
Show "Testing health checks" { Invoke-RestMethod "$GatewayUrl/health" -TimeoutSec 60 } | Out-Null
Show "Testing Users service" { Invoke-RestMethod "$GatewayUrl/users" -TimeoutSec 60 } | Out-Null

$email = "test$(Get-Random)@heroku.com"
$user = Show "Creating new user" {
    Invoke-RestMethod -Method Post "$GatewayUrl/users" -ContentType "application/json" -TimeoutSec 60 `
        -Body (@{ name = "Test User"; email = $email } | ConvertTo-Json)
}

Show "Testing Products service" { Invoke-RestMethod "$GatewayUrl/products" -TimeoutSec 60 } | Out-Null
$product = Show "Creating new product" {
    Invoke-RestMethod -Method Post "$GatewayUrl/products" -ContentType "application/json" -TimeoutSec 60 `
        -Body (@{ name = "Heroku Product"; price = 50; stock = 100 } | ConvertTo-Json)
}

$userId = if ($user.id) { $user.id } else { 1 }
$productId = if ($product.id) { $product.id } else { 1 }
Show "Creating order (userId=$userId, productId=$productId, quantity=2)" {
    Invoke-RestMethod -Method Post "$GatewayUrl/orders" -ContentType "application/json" -TimeoutSec 60 `
        -Body (@{ userId = $userId; productId = $productId; quantity = 2 } | ConvertTo-Json)
} | Out-Null

Show "Stock after order (100 -> 98)" { Invoke-RestMethod "$GatewayUrl/products/$productId" -TimeoutSec 60 } | Out-Null
Show "Order with invalid user (expect 400)" {
    Invoke-RestMethod -Method Post "$GatewayUrl/orders" -ContentType "application/json" -TimeoutSec 60 `
        -Body (@{ userId = 99999; productId = $productId; quantity = 1 } | ConvertTo-Json)
} | Out-Null
Show "Getting all orders" { Invoke-RestMethod "$GatewayUrl/orders" -TimeoutSec 60 } | Out-Null
