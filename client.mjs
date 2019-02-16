import Canvas from 'canvas'
import ac from 'ansi-canvas'
import grpc from 'grpc'
import protoLoader from '@grpc/proto-loader'
import fs from 'fs'

const Image = Canvas.Image

const putImage = (srcImg) => {
    //console.log(`putImage: start`)
    console.log(srcImg.width)
    //console.log(`w,h = ${cs.width}, ${cs.height}`)
    
    const canvas = ac();
    const context = canvas.getContext('2d');

    context.drawImage(srcImg,0,0,canvas.width,canvas.height)
    canvas.render()
}

const genImage = (imbuf, w, h) => {
    //console.dir(imbuf)
    const canvas = new Canvas(w, h)
    const ctx = canvas.getContext('2d')
    const imagedata = ctx.getImageData(0, 0, w, h)
    console.log(`imagedata w,h = ${imagedata.width}, ${imagedata.height}`)
    let pidx = 0
    for (let y = 0; y < imagedata.height; y++) {
        for (let x = 0; x < imagedata.width; x++) {
            const index = (y * imagedata.width + x) * 4
            imagedata.data[index] = imbuf[pidx++] // R
            imagedata.data[index + 1] = imbuf[pidx++] // G
            imagedata.data[index + 2] = imbuf[pidx++] // B
            imagedata.data[index + 3] = 255 // alpha
            //console.log(`${imbuf[pidx]}`)
        }
    }
    console.log(`${imbuf[pidx-1]}: ${pidx}`)
    ctx.putImageData(imagedata, 0, 0)
    const img = new Image
    img.src = canvas.toBuffer()
    console.dir(img)
    console.log(img.width)
    return img
}

const parsePpm = (data) => {
    const readLine = (buf2, len) => {
        let pos = 0
        const strbuf = []

        while (pos < len) {
            if (buf2[pos] === 0x0a) {
                //console.log(`pos = ${pos}`)
                return strbuf.join('')
            }
            strbuf.push(String.fromCharCode(buf2[pos]))
            pos++
        }
        return data.toString()
    }

    let len = data.length
    const line1 = readLine(data, len)
    //console.log(`line1 = ${line1},${line1.length}`)
    let data2 = data.slice(line1.length + 1)
    len = len - line1.length - 1
    const line2 = readLine(data2, len)
    //console.log(`line2 = ${line2}`)
    data2 = data2.slice(line2.length + 1)
    len = len - line2.length - 1
    const line3 = readLine(data2, len)
    //console.log(`line3 = ${line3}`)
    const [w, h] = line3.split(' ')

    len = len - line3.length - 1
    data2 = data2.slice(line3.length + 1)
    const line4 = readLine(data2, len)
    //console.log(`line4 = ${line4}`)
    len = len - line4.length - 1
    data2 = data2.slice(line4.length + 1)
    //console.log(`imgbuf len = ${data2.length}`)
    const img = genImage(data2, w | 0, h | 0)
    console.dir(img)
    putImage(img)
}

const PROTO_PATH = './camtype.proto'

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    })
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
const camtype = protoDescriptor.camtype

const client = new camtype.Camtype(`localhost:50052`, grpc.credentials.createInsecure())

const call = client.camtype(null)
call.on('data',(response)=>{
    //console.dir(response)
    parsePpm(response.ppm)
})
call.on('end',()=> {
    console.log(`end`)
})
