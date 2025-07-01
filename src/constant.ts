import pkg from "../package.json";

export default {
    DEFAULT_CLIENT_VERSION: pkg.version,
    SUPPORTED_FILE_TYPES: [
        // 📄 Documents
        "application/pdf",
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/rtf",
        "application/vnd.oasis.opendocument.text", // .odt

        // 📊 Spreadsheets
        "application/vnd.ms-excel", // .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "text/csv",

        // 📽️ Presentations
        "application/vnd.ms-powerpoint", // .ppt
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx

        // 🗜️ Archives
        "application/zip",
        "application/x-zip-compressed",
        "application/x-tar",
        "application/x-7z-compressed",
        "application/x-rar-compressed",
        "application/gzip",

        // 📝 Plain text formats (optional)
        "text/plain",
        "text/markdown",
    ],
    SUPPORTED_MEDIA_TYPES: [
        // 🎧 Audio
        "audio/mpeg", // .mp3
        "audio/wav", // .wav
        "audio/ogg", // .ogg
        "audio/webm", // .webm
        "audio/aac", // .aac
        "audio/flac", // .flac
        "audio/mp4", // .m4a
        "audio/3gpp", // .3gp audio

        // 🎥 Video
        "video/mp4", // .mp4
        "video/webm", // .webm
        "video/ogg", // .ogv
        "video/quicktime", // .mov
        "video/x-msvideo", // .avi
        "video/x-matroska", // .mkv
        "video/3gpp", // .3gp video

        // 🖼️ Images
        "image/png", // .png
        "image/jpeg", // .jpg, .jpeg
        "image/gif", // .gif
        "image/webp", // .webp
        "image/svg+xml", // .svg
        "image/avif", // .avif
        "image/bmp", // .bmp
        "image/tiff", // .tif, .tiff

        // 🔤 Fonts
        "font/woff", // .woff
        "font/woff2", // .woff2
        "font/ttf", // .ttf
        "font/otf", // .otf
        "application/font-woff", // legacy
        "application/vnd.ms-fontobject", // .eot

        // 📦 Models (3D/CAD)
        "model/gltf+json", // .gltf
        "model/obj", // .obj
        "model/stl", // .stl
        "model/3mf", // .3mf

        // 🔄 Binary fallback
        "application/octet-stream", // generic media or blob data
    ],
};
