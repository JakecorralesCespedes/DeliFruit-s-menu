# DeliFruit's

Menú y panel administrativo hechos con React. Los cambios del menú y los pedidos se guardan en el servidor para que clientes y administración vean la misma información.

## Iniciar en desarrollo

Requiere Node.js 20.19 o superior, o Node.js 22.12 o superior.

1. Instalá las dependencias con `npm install`.
2. Copiá `.env.example` a `.env` y reemplazá `ADMIN_PASSWORD` por una contraseña privada.
3. En una terminal, ejecutá `npm run api`.
4. En otra terminal, ejecutá `npm run dev` y abrí la dirección que indique Vite.

El menú se abre en el navegador. Usá **Administración** para cambiar productos, fotos, precios y toppings, y para revisar pedidos. Al pagar, cada cliente puede confirmar el pedido en la página o enviarlo por WhatsApp; ambas opciones lo registran en el servidor y quedan identificadas en administración.

## Publicar

En un servicio que ejecute Node.js, configurá la variable `ADMIN_PASSWORD` y usá:

```sh
npm install
npm run build
npm start
```

El servidor escucha en el puerto `PORT` (8787 por defecto). Configurá `DATA_DIR` para que apunte al disco persistente del servicio: ahí quedan el menú editado y los pedidos. La web y su API deben estar bajo el mismo dominio para que los cambios y pedidos se compartan.

Las fotos cargadas desde el panel se reducen y se guardan junto con el menú. Las imágenes iniciales están en `public/img/`.
