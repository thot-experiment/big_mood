import fs from 'fs/promises'

const dir = await fs.readdir('.')
const js_filenames = dir.filter(f => f.slice(-3) === 'mjs' && f !== 'build.mjs')

const js_files = await Promise.all(js_filenames.map(
  fd => fs.readFile(fd).then(b => b.toString().replace(/\r\n/g,'\n'))
))
const concat_js = js_files.join('\n')

const html = await fs.readFile('main.html').then(b => b.toString())

const built_file = html
  .replace('%CODE_GOES_HERE%', concat_js)
  .replace(/\r\n/g,'\n')
  .replace('<!DOCTYPE html>',`<!DOCTYPE html>
<!-- THIS FILE GENERATED BY build.mjs, DO NOT MODIFY -->`)

//convert to buffer to avoid line ending change on windows
const buffer = Buffer.from(built_file)

await fs.writeFile('index.html',buffer, 'binary')

console.log('built index.html')
