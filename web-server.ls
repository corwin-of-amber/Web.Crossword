express = require('express')

get-my-ip = ->
  os = require('os')
  ifaces = os.networkInterfaces()

  addresses = []
    for name, iface of ifaces
      for entry in iface
        if (entry.family == 'IPv4' && !entry.internal)
           ..push entry.address

  addresses[0] ? 'localhost'


PORT = 8000
HOST = get-my-ip!


app = express()

app.get('/', (req, res) -> res.redirect('crossword.html'))

app.use(express.static('.'))


server = app.listen PORT, ->
  console.log "Express server listening on http://#{HOST}:#{server.address!port}"
  window.addEventListener 'unload' -> server.close!


export app, server
