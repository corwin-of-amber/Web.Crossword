// @ts-ignore
import { getMyIp } from './web-server.ls';

const PORT = 2225;

async function start(port=PORT, host=getMyIp()) {

    const express = require('express'); /* @kremlin.native */

    var app = express();

    app.use(express.static('build/kremlin'));
    app.use('/data', express.static('data'));


    var server = app.listen(port, () => {
        console.log(`Express server listening on http://${host}:${server.address().port}`);
        window.addEventListener('unload', () => server.close());
    });

    return {app, server};
}

export { start }