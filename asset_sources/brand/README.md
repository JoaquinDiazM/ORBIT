# Fuente de marca de ORBIT

`orbit-mark.svg` es la fuente vectorial canónica del logotipo de ORBIT. El diseño fue
aportado y aprobado por JoaquinDiazM para el proyecto y se distribuye bajo la licencia MIT
del repositorio.

No edites sus copias públicas a mano. Para sincronizar el recurso que usa el README y el
favicon web, ejecuta desde la raíz:

```powershell
node scripts/generate-orbit-brand-assets.mjs
```

Para comprobar que los derivados no se apartaron de la fuente:

```powershell
node scripts/generate-orbit-brand-assets.mjs --check
```

El SVG usa un lienzo cuadrado de `64 × 64` y una silueta centrada, de modo que se mantiene
legible tanto en el README como a tamaño de favicon.
