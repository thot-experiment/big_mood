import fs from 'fs/promises'


const dir = await fs.readdir('.')
const js_filenames = dir.filter(f => f.slice(-3) === 'mjs' && f !== 'build.mjs')

const js_files = await Promise.all(js_filenames.map(
  fd => fs.readFile(fd).then(b => b.toString())
))
const concat_js = js_files.join('\n')

const html = await fs.readFile('main.html').then(b => b.toString())
const built_file = html.replace('%CODE_GOES_HERE%', concat_js).replace(/\r\n/g,'\n')

const buffer = Buffer.from(built_file)
console.log(buffer)

await fs.writeFile('big_mood.html',buffer, 'binary')

console.log('built big_mood.html')
