# ROSSEK — Elegí tu lado

Demo privada de campaña, independiente de la tienda. Ocho secciones cinematográficas y ocho prendas reales de ROSSEK. HTML, CSS y JavaScript sin framework, backend ni integración comercial.

## Abrir y presentar

Abrir `Abrir demo.cmd`, o ejecutar `npm install` y `npm run dev`. Demo: http://127.0.0.1:5173/.

`npm run build` produce `dist/`, lista para hosting estático. `npm run preview` sirve http://127.0.0.1:4173/. Entrega: `delivery/ROSSEK-web.zip`. Grabación real de Chromium: `delivery/ROSSEK-demo.mp4`.

## Desplegar en Vercel o GitHub Pages

El build utiliza rutas relativas, válidas tanto en la raíz de un dominio como bajo `/nombre-del-repositorio/`. No requiere variables de entorno ni acceso a Higgsfield. Subir el código y `public/`; los videos finales ya están incluidos. Las fuentes originales, grabaciones y registros de producción quedan fuera del despliegue.

**Vercel:** importar el repositorio y desplegar. `vercel.json` fija Vite, `npm run build` y salida `dist`. La instalación omite scripts de las herramientas de producción de medios, que no se necesitan para compilar.

**GitHub Pages:** esta entrega publica el contenido compilado desde la rama `gh-pages`, carpeta raíz. En Settings → Pages, la fuente es “Deploy from a branch”. Para actualizar, ejecutar `npm run build` y subir el contenido de `dist/` a esa rama. El código fuente permanece en `main`; no se necesitan permisos para modificar workflows.

Demo publicada: https://alienrq.github.io/rossek-demo/.

Referencias: [Vercel con Vite](https://vercel.com/docs/frameworks/frontend/vite), [GitHub Pages con Vite](https://vite.dev/guide/static-deploy.html#github-pages).

## Versión actual

Por decisión del cliente, esta revisión incluye el montaje de acción del archivo aportado. Utiliza 88,8 segundos, desde 4 hasta 92,8 segundos, divididos en ocho fragmentos cronológicos. Conserva la velocidad, cortes, encuadre y marcas de autor del original. Sin audio. La fuente permanece intacta en el proyecto.

Cada sección relaciona el video con una prenda: foto local, nombre real y enlace a su ficha en ROSSEK. No se muestran precios, promociones ni disponibilidad. Las fotos originales se descargaron de las páginas oficiales; procedencia en `production/product-sources.json`.

El [storyboard](production/storyboard.md) describe el recorrido. `chapters.js` contiene intervalos, textos y productos. `node production/prepare-chapters.mjs` prepara los ocho videos, variantes móviles y pósteres. `node production/fetch-products.mjs` actualiza las fotos desde las fichas originales.

La primera propuesta generada con Higgsfield queda en `production/previous-version/`. Esta entrega utiliza el material aportado con autorización expresa, sin nuevas generaciones.

## Interacción

Un único escenario se fija durante las ocho secciones. El scroll nativo modifica el tiempo de videos pausados: avanzar, detenerse y retroceder. El recorrido utiliza 75svh por sección, con transiciones breves a negro. La navegación 01–08 permite saltar entre secciones con teclado o clic.

No hay barra de progreso, contador de video, controles nativos visibles, autoplay, bucles ni interceptación de rueda. Se cargan el fragmento actual y el siguiente; el resto espera. H.264 silencioso, keyframes cada seis fotogramas y metadatos al inicio. Escritorio: 1280 × 720; móvil: 960 × 540.

Video completo mediante `object-fit: contain`. Producto al costado en escritorio y debajo en móvil. Solo dos etiquetas HTML: GOJO y SUKUNA. Sus líneas se calculan desde coordenadas normalizadas del original, con pocos keyframes manuales; se ocultan fuera de las ventanas verificadas, durante las transiciones y al buscar fotogramas.

Movimiento reducido: ocho pósteres estáticos, productos y enlaces, sin descargar videos. Fallos de video: pósteres y productos disponibles. El cierre enlaza a https://www.rossekgainz.com/anime/jujutsu-kaisen1/.

## Verificación

`npm test` verifica los dieciséis archivos de video, duración original y ausencia de audio. En Chromium real comprueba ocho escenas y productos, avance/retroceso, pausa, transición, etiquetas, navegación, ausencia de barras, enlaces, escritorio 1440 × 900 y móvil 390 × 844 y 360 × 640. También movimiento reducido y cargas fallidas. Capturas en `test-results/`.

Para grabar otra vez, mantener `npm run dev` activo y ejecutar `node scripts/record.mjs`.

Después de compilar, `node scripts/verify-deploy.mjs` prueba el build en Chromium tanto en `/` como bajo `/testrossek/`, incluyendo los ocho videos, productos y fuentes. El servidor de prueba admite peticiones de rango para comprobar el seek del video.

Propuesta privada. Antes de una publicación comercial, confirmar con el cliente los derechos del material y los personajes. No se afirma ninguna colaboración oficial.
