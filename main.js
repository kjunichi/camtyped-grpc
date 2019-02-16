const ffi = require('ffi-napi')
const ref = require('ref-napi')
const StructType = require('ref-struct-di')(ref)

const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const PROTO_PATH = __dirname + '/camtype.proto'

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    })

camtype_proto = grpc.loadPackageDefinition(packageDefinition).camtype

const c_int = ref.types.int
const c_uchar = ref.types.uchar
const c_void = ref.types.void

const ImgBufferVal = StructType({
    ptr: ref.refType(c_uchar),
    size: c_int,
    raw: ref.refType(c_void)
})
const ImgBufferPtr = ref.refType(ImgBufferVal)

const libwebcamrs = ffi.Library('libwebcamrs', {
    'named_window': ['void', ['string']],
    'video_capture': ['pointer', ['int']],
    'destroy_all_windows': ['void', []],
    'read': ['void', ['pointer', 'pointer']],
    'imshow': ['void', ['string', 'pointer']],
    'wait_key': ['int', ['int']],
    'release_video_capture': ['void', ['pointer']],
    'create_mat': ['pointer', []],
    'imwrite': ['int', ['string', 'pointer']],
    'mat_cols': ['int', ['pointer']],
    'mat_data': ['pointer', ['pointer']],
    'imencode': [ImgBufferPtr, ['string', 'pointer', 'pointer']],
    'free_img_buffer': ['void', ['pointer']]
})

const camtype = (call) => {
    console.log(`camtype : start`)

    const cap = libwebcamrs.video_capture(0)
    let frame = libwebcamrs.create_mat()

    setTimeout(() => {
        libwebcamrs.read(cap, frame)
        const buf = libwebcamrs.imencode('.ppm', frame, ref.NULL)
        const imgbuf = buf.deref()
        const data = ref.reinterpret(imgbuf.ptr, imgbuf.size)

        call.write({ ppm: data })
        call.end()

        libwebcamrs.release_video_capture(cap)
    }, 2000)

    console.log(`camtype : end`)
}

const main = () => {
    const server = new grpc.Server();
    server.addService(camtype_proto.Camtype.service, { Camtype: camtype });
    server.bind('0.0.0.0:50052', grpc.ServerCredentials.createInsecure());
    server.start();
}

main()