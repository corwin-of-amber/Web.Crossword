
PORT = 8000

get-my-ip = ->
  os = require('os')
  ifaces = os.networkInterfaces()

  addresses = []
    for name, iface of ifaces
      for entry in iface
        if (entry.family == 'IPv4' && !entry.internal)
           ..push entry.address

  addresses[0] ? 'localhost'



export get-my-ip