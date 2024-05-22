const dateToFilename = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`

let grabbed = null
let scaling = false
let startCoords = {x:0,y:0}
let zindexcounter = 0
const sidebar = document.getElementById('sidebar')
const slider = document.getElementById('slider')
const board = document.getElementById('board')

slider.addEventListener('click',() => {
  sidebar.style.width = sidebar.style.width === '0px' ? '400px' : '0px'
  //board.style.left = board.style.left === '0px' ? '400px' : '0px'
  slider.classList.toggle('expanded')    
})

const board_w = document.getElementById('board-wrapper')
const saveBtn = document.getElementById('save')
const delBtn = document.getElementById('delete')

const clientToBoardCoords = (clientX, clientY, boardScale) => {
  const boardRect = board.getBoundingClientRect()
  const x = (clientX - boardRect.left) / boardScale + board.scrollLeft
  const y = (clientY - boardRect.top) / boardScale + board.scrollTop
  return { x, y }
}

const import_json = obj => {
  for (const [name, metadata] of Object.entries(obj)) {
    if (!(savedImages[name])) {
      addImage({ name, ...metadata })
      savedImages[name] = metadata
    }
  }
}

window.expt = () => {
  const blob = new Blob([JSON.stringify(savedImages)], { type: 'application/json' })
  const a = document.createElement('a')
  let title = document.querySelector('#board-title').innerText.replace(/ +/g,'_').replace(/\W/gm,'')
  if (!(title.replace(/_/g,'').trim())) title = 'big_mood'
  a.href = URL.createObjectURL(blob)
  a.download = `${title}_${dateToFilename(new Date())}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}


window.addEventListener('beforeunload', e => {
  e.preventDefault()
})


window.savedImages = {} 
document.addEventListener('dragover', e => e.preventDefault())
document.addEventListener('drop', async e => {
  e.preventDefault()
  //TODO see if this can be rewritten to only use .items api
  if (e.dataTransfer && e.dataTransfer.items && !(e.dataTransfer.files.length)) {
    //Firefox only, chrome also returns an imagefile when dragging an image from
    //a webpage
    const url = e.dataTransfer.getData('text/plain')

    let src = url 

    let name = Math.random().toString(16).padEnd(10,'0').slice(2,10)
    const {x,y} = clientToBoardCoords(e.clientX,e.clientY,boardScale)
    while (savedImages[name]) name = 'x'+name
    const mood_image = {name, src, x, y}
    const img = addImage(mood_image)
    savedImages[name] = img.metadata

  } else if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const files = [...e.dataTransfer.files]
    let file_num = 0
    for (const file of files) {
      if (file?.type.startsWith('image/')) {
        let {name} = file
        const src = await toBase64(file)
        const {x,y} = clientToBoardCoords(e.clientX,e.clientY,boardScale)
        while (savedImages[name]) name = 'x'+name
        const mood_image = {name, src, x:x+file_num*50, y:y+file_num*50}
        const img = addImage(mood_image)
        savedImages[name] = img.metadata
      } else if (file.type === 'application/json') {
        const reader = new FileReader()
        reader.onload = (event) => {
          const obj = JSON.parse(event.target.result)
          import_json(obj)
        }
        reader.readAsText(file)
      } else if (file.type === 'text/html') {
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target.result
          const dom = new DOMParser().parseFromString(result, 'text/html')
          const obj = JSON.parse(dom.querySelector('#saved-image-div').innerText.slice(21,-24))
          import_json(obj)

        }
        reader.readAsText(file)
      } else {
        console.log('unsupported filetype')
      }
      file_num++
    }
  }
})

document.addEventListener('paste', async e => {
  const clipboardData = e.clipboardData || window.clipboardData
  const file = clipboardData.items[0].getAsFile()
  if (file?.type.startsWith('image/')) {
    let {name} = file
    const src = await toBase64(file)
    const {x, y} = clientToBoardCoords(last_mpos.x, last_mpos.y, boardScale)
    while (savedImages[name]) name = 'x'+name
    const mood_image = {name, src, x, y}
    const img = addImage(mood_image)
    savedImages[name] = img.metadata
  }
})

let startBoardCoords;

document.addEventListener('keyup', e => {
  //grabbed.classList.remove('grabbing')
  oscale = false
  startBoardCoords = undefined
  grabbed = null
  scaling = null
})

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    document.getElementById('save').click()
  }
  if (e.key === 'g') {
    grabbed = document.querySelector('.grabbing')
    grabbed.style.zIndex = zindexcounter
    zindexcounter++
  }
  if (e.key === 's') {
    scaling = document.querySelector('.grabbing')
    scaling.style.zIndex = zindexcounter
    zindexcounter++
  }
  if (e.key === 'x') {
    const to_delete = document.querySelector('.grabbing')
    delete savedImages[to_delete.metadata.name]
    to_delete.remove()      
  }
})
let dist = ([x1,y1],[x2,y2]) => ((x1-x2)**2+(y1-y2)**2)**0.5
let sd,oscale
let last_mpos = {x:0,y:0}
document.addEventListener('mousemove', e => {
  last_mpos = {x:e.clientX,y:e.clientY}
  if (grabbed || scaling) {
    const {name} = grabbed?.metadata || scaling?.metadata
    const {x,y} = savedImages[name]
    if (!startBoardCoords) {
      let {x:sx, y:sy} = clientToBoardCoords(e.clientX, e.clientY, boardScale)
      if(isNaN(sx)) sx = 0
      if(isNaN(sy)) sy = 0
      sd = dist([x,y],[sx,sy])
      startBoardCoords = {x:sx-x, y:sy-y}
    }
    const boardCoords = clientToBoardCoords(e.clientX, e.clientY, boardScale)
    const dx = Math.max(boardCoords.x - startBoardCoords.x,0)
    const dy = Math.max(boardCoords.y - startBoardCoords.y,0)

    if (grabbed){
      grabbed.style.left = dx + 'px'
      grabbed.style.top = dy + 'px'

      Object.assign(savedImages[name], { x: dx, y: dy })
    }
    if (scaling) {
      let d = dist([x,y],[boardCoords.x,boardCoords.y])
      let factor = d/sd
      let {width,name,scale} = scaling.metadata
      if (!oscale) oscale = scale
      let newscale = oscale*factor
      scaling.metadata.scale = newscale
      let img = scaling.querySelector('img')
      img.style.width = width*newscale+'px'
      //TODO oh god this is bad it's all bad now
      savedImages[name].scale = newscale

    }
  }
})


// Load previously saved images
window.loadImages = images => Object.values(images).forEach(addImage)
delBtn.addEventListener('click', () => {
  if (confirm("Are you sure?")) {
    savedImages = {}
    document.getElementById('board').innerHTML = ''

  }
})
// Save current board state
saveBtn.addEventListener('click', () => {
  document.getElementById('board').innerHTML = ''
  const saved_div = document.getElementById('saved-image-div')
  if (saved_div) saved_div.innerHTML = ''
  //delete saved images div if exists (we're doing qsa for backwards compat) 
  document.querySelectorAll('#saved-images-div')?.forEach(div => remove())

  const savedHtml = document.documentElement.outerHTML
  const saveScript = `<script id="saved-image-div">window.savedImages = ${JSON.stringify(savedImages)};loadImages(savedImages)<${"\/"}script>`
  const blob = new Blob([savedHtml.replace(`<${"\/"}body>`, `${saveScript}<${"\/"}body>`)], {type: 'text/html'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  let title = document.querySelector('#board-title').innerText.replace(/ +/g,'_').replace(/\W/gm,'')
  if (!(title.replace(/_/g,'').trim())) title = 'big_mood'
  a.href = url
  a.download = `${title}_${dateToFilename(new Date())}.html`
  a.click()
  URL.revokeObjectURL(url)
  loadImages(savedImages)
})

// Utility functions
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const addImage = mood_image => {
  let {src, x, y, scale} = mood_image
  const div = document.createElement('div')
  const img = document.createElement('img')
  img.src = src
  div.classList.add('img-wrap')
  div.metadata = mood_image
  div.style.position = 'absolute'
  div.style.left = x + 'px'
  div.style.top = y + 'px'

  img.onload = () => {
    let {width,height} = img
    div.metadata.width = width
    div.metadata.height = height

    scale = scale || (width > height ? 1/(width/1024) : 1/(height/1024))

    div.metadata.scale = scale
    img.style.width = width*scale+'px'

    div.addEventListener('mouseover', () => {
      if (grabbed === null) div.classList.add('grabbing')
    })

    div.addEventListener('mouseout', () => {
      if (!grabbed) div.classList.remove('grabbing')
    })

    img.addEventListener('wheel', e => {
      if (grabbed){
        if (e.deltaY < 0) scale *= 1.1
        else scale /= 1.1
        div.metadata.scale = scale
        img.style.width = width*scale+'px'
        //TODO oh god this is bad it's all bad now
        savedImages[div.metadata.name].scale = scale
      }
    })

  }

  div.appendChild(img)

  board.appendChild(div)
  return div
}

let boardScale = board.style.transform.match(/scale\((.+)\)/)?.[1] || 1
// Panning
let panStart = {}
let isPanning = false

board_w.addEventListener('mousedown', e => {
  if (e.buttons === 9) {
    e.preventDefault()
    grabbed = document.querySelector('.grabbing')
    grabbed.style.zIndex = zindexcounter
    zindexcounter++
  }
  if (e.buttons == 4) {
    e.preventDefault()
    boardScale = 1
    board.style.transform = `scale(${boardScale})`
  }
  if (e.buttons == 1) {
    e.preventDefault()
    isPanning = true
    panStart = { x: e.clientX, y: e.clientY }
  }
})

document.addEventListener('mousemove', e => {
  if (isPanning) {
    //const { x, y } = clientToBoardCoords(e.clientX, e.clientY, boardScale)

    const {x,y} = { x: e.clientX, y: e.clientY }
    const dx = (panStart.x - x)
    const dy = (panStart.y - y)
    board_w.scrollTo(board_w.scrollLeft + dx, board_w.scrollTop + dy)
    panStart = { x, y }
  }
})

document.addEventListener('mouseup', () => {
  startBoardCoords = undefined
  isPanning = false
  grabbed = null
})

// Zooming
board_w.addEventListener('wheel', e => {
  e.preventDefault()
  if(!grabbed) {
    let fs = boardScale
    const { x, y } = clientToBoardCoords(e.clientX, e.clientY, boardScale)
    if (e.deltaY < 0) boardScale *= 1.1
    else boardScale /= 1.1
    board.style.transform = `scale(${boardScale})`
    const { x:nx, y:ny } = clientToBoardCoords(e.clientX, e.clientY, boardScale)
    let dx = (x-nx)*boardScale
    let dy = (y-ny)*boardScale
    board_w.scrollTo(
      board_w.scrollLeft + dx, 
      board_w.scrollTop + dy
    )
  }
})
