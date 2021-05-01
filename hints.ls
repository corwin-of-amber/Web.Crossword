$ ->
  hints = $ '.hints'

  pos = {x: -80, y: -80}
  sz = 1500

  if localStorage['hints']
    {pos, sz} = JSON.parse that

  update = ->
    hints.css background-position: "right #{pos.x}px bottom #{pos.y}px", \
              background-size: "#{sz}px", opacity: 1
    localStorage['hints'] = JSON.stringify {pos, sz}

  update!

  gesture = void

  hints
    ..on 'mousedown' ->
      console.log it
      gesture := 
        start: {x: it.pageX, y: it.pageY}
        origin: {...pos}
    ..on 'mousemove' ->
      if gesture
        {start: st, origin: o} = gesture
        at = {x: it.pageX, y: it.pageY}
        pos := {x: o.x - (at.x - st.x), y: o.y - (at.y - st.y)}
        update!
    ..on 'mouseup' -> gesture := void
    ..on 'mousewheel' -> 
      sz += it.originalEvent.deltaY
      update!
      it.preventDefault!
