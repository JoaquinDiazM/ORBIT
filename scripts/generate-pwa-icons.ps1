param([switch]$Check)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$orbitRoot = Split-Path -Parent $PSScriptRoot
$brandSource = Join-Path $orbitRoot 'asset_sources/brand/orbit-mark.svg'
[xml]$svg = Get-Content -LiteralPath $brandSource -Raw
if ($svg.svg.viewBox -ne '0 0 64 64' -or $svg.svg.path.d -ne 'M32 7 52 18.5v27L32 57 12 45.5v-27Z') {
    throw 'La geometría de la marca cambió: revisar el exportador antes de generar iconos.'
}

function New-OrbitColor([string]$Hex) { return [Drawing.ColorTranslator]::FromHtml($Hex) }
function Get-OrbitNumber([string]$Value) {
    return [single]::Parse($Value, [Globalization.CultureInfo]::InvariantCulture)
}

# Exportación raster de la marca SVG existente, sin fuentes, red ni dependencias externas.
# Los dos tamaños quedan versionados; Linux no necesita System.Drawing para servirlos.
foreach ($size in @(192, 512)) {
    $scale = 4
    $bitmap = [Drawing.Bitmap]::new($size * $scale, $size * $scale)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.ScaleTransform(($size * $scale / 64), ($size * $scale / 64))
        $background = [Drawing.Drawing2D.GraphicsPath]::new()
        $background.AddArc(0, 0, 28, 28, 180, 90)
        $background.AddArc(36, 0, 28, 28, 270, 90)
        $background.AddArc(36, 36, 28, 28, 0, 90)
        $background.AddArc(0, 36, 28, 28, 90, 90)
        $background.CloseFigure()
        $brush = [Drawing.SolidBrush]::new((New-OrbitColor $svg.svg.rect.fill))
        try { $graphics.FillPath($brush, $background) } finally { $brush.Dispose(); $background.Dispose() }

        $points = [Drawing.PointF[]]@(
            [Drawing.PointF]::new(32, 7), [Drawing.PointF]::new(52, 18.5),
            [Drawing.PointF]::new(52, 45.5), [Drawing.PointF]::new(32, 57),
            [Drawing.PointF]::new(12, 45.5), [Drawing.PointF]::new(12, 18.5)
        )
        $brush = [Drawing.SolidBrush]::new((New-OrbitColor $svg.svg.path.fill))
        $pen = [Drawing.Pen]::new((New-OrbitColor $svg.svg.path.stroke), (Get-OrbitNumber $svg.svg.path.'stroke-width'))
        $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
        try { $graphics.FillPolygon($brush, $points); $graphics.DrawPolygon($pen, $points) }
        finally { $brush.Dispose(); $pen.Dispose() }

        if ($svg.svg.g.transform -ne 'rotate(-18 32 32)') { throw 'Transformación SVG inesperada.' }
        $saved = $graphics.Save()
        $graphics.TranslateTransform(32, 32)
        $graphics.RotateTransform(-18)
        $graphics.TranslateTransform(-32, -32)
        foreach ($ellipse in $svg.svg.g.ellipse) {
            $cx = Get-OrbitNumber $ellipse.cx; $cy = Get-OrbitNumber $ellipse.cy
            $rx = Get-OrbitNumber $ellipse.rx; $ry = Get-OrbitNumber $ellipse.ry
            $pen = [Drawing.Pen]::new((New-OrbitColor $svg.svg.g.stroke), (Get-OrbitNumber $ellipse.'stroke-width'))
            try { $graphics.DrawEllipse($pen, ($cx - $rx), ($cy - $ry), (2 * $rx), (2 * $ry)) }
            finally { $pen.Dispose() }
        }
        $graphics.Restore($saved)
        foreach ($circle in $svg.svg.circle) {
            $cx = Get-OrbitNumber $circle.cx; $cy = Get-OrbitNumber $circle.cy
            $radius = Get-OrbitNumber $circle.r
            $brush = [Drawing.SolidBrush]::new((New-OrbitColor $circle.fill))
            try { $graphics.FillEllipse($brush, ($cx - $radius), ($cy - $radius), (2 * $radius), (2 * $radius)) }
            finally { $brush.Dispose() }
        }

        $output = [Drawing.Bitmap]::new($size, $size)
        $resampler = [Drawing.Graphics]::FromImage($output)
        $stream = [IO.MemoryStream]::new()
        try {
            $resampler.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $resampler.DrawImage($bitmap, 0, 0, $size, $size)
            $output.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
            $target = Join-Path $orbitRoot "public/assets/brand/orbit-$size.png"
            $bytes = $stream.ToArray()
            if ($Check) {
                if (-not (Test-Path -LiteralPath $target) -or
                    [Convert]::ToBase64String([IO.File]::ReadAllBytes($target)) -ne [Convert]::ToBase64String($bytes)) {
                    throw "Icono desactualizado: $target"
                }
            } else { [IO.File]::WriteAllBytes($target, $bytes) }
            Write-Output "Icono $size x $size verificado."
        } finally { $stream.Dispose(); $resampler.Dispose(); $output.Dispose() }
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}
