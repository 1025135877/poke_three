# 下载 Google Fonts 字体到本地
# 包含: Plus Jakarta Sans、Be Vietnam Pro、Material Symbols Outlined

$fontsDir = "$PSScriptRoot\..\public\fonts"
New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null
New-Item -ItemType Directory -Force -Path "$fontsDir\material-symbols" | Out-Null

# 模拟浏览器 User-Agent（需要 woff2 格式）
$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

function Download-FontCSS($url, $label) {
    Write-Host "正在获取 $label CSS..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
    return $response.Content
}

function Extract-And-Download($css, $subdir = "") {
    $pattern = 'src: url\(([^)]+\.woff2)\) format\(''woff2''\);\s+unicode-range: ([^;]+);'
    $matches2 = [regex]::Matches($css, "url\(([^)]+\.woff2)\)")
    $downloaded = @{}
    foreach ($m in $matches2) {
        $url = $m.Groups[1].Value
        if ($downloaded[$url]) { continue }
        $downloaded[$url] = $true
        # 从URL提取文件名
        $fileName = ($url -split '/')[-1] -replace '\?.*', ''
        if ($subdir) {
            $outPath = "$fontsDir\$subdir\$fileName"
        } else {
            $outPath = "$fontsDir\$fileName"
        }
        Write-Host "  下载: $fileName" -ForegroundColor Gray
        try {
            Invoke-WebRequest -Uri $url -Headers $headers -OutFile $outPath -UseBasicParsing
        } catch {
            Write-Host "  失败: $url" -ForegroundColor Red
        }
    }
}

# ======== 1. Plus Jakarta Sans + Be Vietnam Pro ========
$textFontUrl = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap"
$textCSS = Download-FontCSS $textFontUrl "Plus Jakarta Sans + Be Vietnam Pro"
Extract-And-Download $textCSS

# 保存处理后的CSS（替换URL为本地路径）
$localTextCSS = $textCSS -replace "https://fonts\.gstatic\.com/s/[^/]+/[^/]+/([^)]+\.woff2)", "./`$1"
$localTextCSS | Out-File "$fontsDir\text-fonts.css" -Encoding UTF8

# ======== 2. Material Symbols Outlined ========
$msUrl = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
$msCSS = Download-FontCSS $msUrl "Material Symbols Outlined"

# 提取并下载 Material Symbols 字体文件
$msMatches = [regex]::Matches($msCSS, "url\(([^)]+\.woff2)\)")
$msFileMap = @{}
$msIndex = 0
foreach ($m in $msMatches) {
    $url = $m.Groups[1].Value
    if ($msFileMap[$url]) { continue }
    $msIndex++
    $outName = "material-symbols-$msIndex.woff2"
    $msFileMap[$url] = $outName
    $outPath = "$fontsDir\material-symbols\$outName"
    Write-Host "  下载 MS: $outName" -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $url -Headers $headers -OutFile $outPath -UseBasicParsing
    } catch {
        Write-Host "  失败: $url" -ForegroundColor Red
    }
}

# 替换CSS中的URL为本地路径
$localMsCSS = $msCSS
foreach ($url in $msFileMap.Keys) {
    $localMsCSS = $localMsCSS -replace [regex]::Escape($url), ("./material-symbols/" + $msFileMap[$url])
}
$localMsCSS | Out-File "$fontsDir\material-symbols.css" -Encoding UTF8

Write-Host ""
Write-Host "✅ 字体下载完成！" -ForegroundColor Green
Write-Host "字体目录: $fontsDir" -ForegroundColor Green
