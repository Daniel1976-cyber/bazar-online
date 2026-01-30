# Romero Backend (Node + Express + JSON)

Pequeño backend para almacenar el catálogo de productos en un archivo JSON.

## Requisitos
- Node.js (v14+ recomendado)
- npm

## Instalar dependencias
Abre PowerShell en la carpeta del proyecto:

```powershell
cd "c:\Users\Yunior\Desktop\bazaelromero"
npm install
```

## Ejecutar
- En producción:

```powershell
npm start
```

- En desarrollo (si instalaste `nodemon`):

```powershell
npm run dev
```

El servidor por defecto escucha en `http://localhost:3000`.

## Endpoints
- `GET /products` — Lista todos los productos
- `GET /products/:id` — Obtiene un producto
- `POST /products` — Crea un producto (envía JSON)
- `PUT /products/:id` — Actualiza un producto
- `DELETE /products/:id` — Elimina un producto
- `POST /import` — Reemplaza todo el catálogo (envía un array JSON)

Ejemplo de `POST /products` (fetch desde el front):

```js
fetch('http://localhost:3000/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'Remera ejemplo',
    precio: 25,
    categoria: 'Ropa de Hombre',
    disponible: true,
    img: 'https://ejemplo.com/imagen.jpg'
  })
}).then(r => r.json()).then(console.log);
```

## Notas
- El servidor usa `data/catalog.json` para persistir. Los datos permanecen en disco en la máquina donde se ejecuta.
- Las imágenes en Base64 (si las envías) se guardan como string en `img` pero eso puede crecer mucho el archivo JSON. Para producción, considera usar almacenamiento de archivos (S3, Cloud Storage, etc.).

Si quieres, puedo:
- Ejecutar `npm install` y arrancar el servidor aquí.
- Modificar `admin.html` para que guarde/lea desde este backend en lugar de `localStorage`.
