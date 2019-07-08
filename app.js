"use strict";

const NodeMediaServer = require('node-media-server');
const ngrok = require('ngrok');
const express = require('express');
const cors = require('cors');
const logger = require('morgan');

const nms = new NodeMediaServer({
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        allow_origin: '*'
    }
});
nms.run();

const app = express();
app.use(logger("short"));
app.use(cors());

ngrok.authtoken(process.env.NGROK_TOKEN)
    .then(async () => {
        const url = await ngrok.connect(3000);
        const liveUrl = await ngrok.connect(8000);

        console.log(`Forwarding ${liveUrl} -> localhost:8000`);

        app.get('/', (req, res) => res.send('Hello World!'));
        app.get('/live', (req, res) => res.json({
                address: `${liveUrl}/live/bushitsuchan.flv`
            })
        );
        app.get('/viewer', (req, res) => res.render("flv.ejs", {url: url})
        );

        app.listen(3000, () => console.log(`Forwarding ${url} -> localhost:3000`));
        console.log(`Please check ${url}/viewer`);
    }).catch(e => console.error(e));