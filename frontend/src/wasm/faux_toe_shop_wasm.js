let wasm;

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

const ImageBufferFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_imagebuffer_free(ptr >>> 0, 1));

/**
 * ImageBuffer represents a raw RGBA image in memory.
 * Pixels are stored as f32 values in range [0.0, 1.0] for precision.
 */
export class ImageBuffer {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ImageBuffer.prototype);
        obj.__wbg_ptr = ptr;
        ImageBufferFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ImageBufferFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_imagebuffer_free(ptr, 0);
    }
    /**
     * Apply brightness adjustment
     * brightness: -1.0 to 1.0 (0.0 = no change)
     * @param {number} amount
     */
    brightness(amount) {
        wasm.imagebuffer_brightness(this.__wbg_ptr, amount);
    }
    /**
     * Convert HSL to RGB
     * @param {number} h
     * @param {number} s
     * @param {number} l
     * @returns {Float32Array}
     */
    hslToRgb(h, s, l) {
        const ret = wasm.imagebuffer_hslToRgb(this.__wbg_ptr, h, s, l);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Convert RGB to HSL
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {Float32Array}
     */
    rgbToHsl(r, g, b) {
        const ret = wasm.imagebuffer_rgbToHsl(this.__wbg_ptr, r, g, b);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Apply saturation adjustment
     * saturation: -1.0 to 1.0 (0.0 = no change, -1.0 = grayscale)
     * @param {number} amount
     */
    saturation(amount) {
        wasm.imagebuffer_saturation(this.__wbg_ptr, amount);
    }
    /**
     * Get the raw pixel data as u8 array (for Canvas putImageData)
     * @returns {Uint8Array}
     */
    toUint8Array() {
        const ret = wasm.imagebuffer_toUint8Array(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Create a new ImageBuffer from raw RGBA u8 data
     * @param {number} width
     * @param {number} height
     * @param {Uint8Array} data
     */
    constructor(width, height, data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.imagebuffer_new(width, height, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        ImageBufferFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Apply Gaussian blur
     * radius: blur radius in pixels (1-100)
     * @param {number} radius
     */
    blur(radius) {
        wasm.imagebuffer_blur(this.__wbg_ptr, radius);
    }
    /**
     * Blend another image buffer onto this one
     * mode: 0=normal, 1=multiply, 2=screen, 3=overlay
     * @param {ImageBuffer} other
     * @param {number} opacity
     * @param {number} mode
     */
    blend(other, opacity, mode) {
        _assertClass(other, ImageBuffer);
        wasm.imagebuffer_blend(this.__wbg_ptr, other.__wbg_ptr, opacity, mode);
    }
    /**
     * Create an empty ImageBuffer
     * @param {number} width
     * @param {number} height
     * @returns {ImageBuffer}
     */
    static empty(width, height) {
        const ret = wasm.imagebuffer_empty(width, height);
        return ImageBuffer.__wrap(ret);
    }
    /**
     * Apply sepia tone
     */
    sepia() {
        wasm.imagebuffer_sepia(this.__wbg_ptr);
    }
    /**
     * Get the width
     * @returns {number}
     */
    get width() {
        const ret = wasm.imagebuffer_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the height
     * @returns {number}
     */
    get height() {
        const ret = wasm.imagebuffer_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Invert colors
     */
    invert() {
        wasm.imagebuffer_invert(this.__wbg_ptr);
    }
    /**
     * Get buffer length
     * @returns {number}
     */
    getLen() {
        const ret = wasm.imagebuffer_getLen(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get a pointer to the internal buffer for zero-copy access
     * @returns {number}
     */
    getPtr() {
        const ret = wasm.imagebuffer_getPtr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Apply contrast adjustment
     * contrast: -1.0 to 1.0 (0.0 = no change)
     * @param {number} amount
     */
    contrast(amount) {
        wasm.imagebuffer_contrast(this.__wbg_ptr, amount);
    }
    /**
     * Convert to grayscale
     */
    grayscale() {
        wasm.imagebuffer_grayscale(this.__wbg_ptr);
    }
}
if (Symbol.dispose) ImageBuffer.prototype[Symbol.dispose] = ImageBuffer.prototype.free;

export function init() {
    wasm.init();
}

/**
 * Process a raw pixel buffer in-place (for use with SharedArrayBuffer)
 * This avoids copying data across the WASM boundary
 * @param {Float32Array} pixels
 * @param {number} amount
 */
export function processBrightnessInPlace(pixels, amount) {
    var ptr0 = passArrayF32ToWasm0(pixels, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.processBrightnessInPlace(ptr0, len0, pixels, amount);
}

/**
 * @param {Float32Array} pixels
 * @param {number} amount
 */
export function processContrastInPlace(pixels, amount) {
    var ptr0 = passArrayF32ToWasm0(pixels, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.processContrastInPlace(ptr0, len0, pixels, amount);
}

/**
 * @param {Float32Array} pixels
 */
export function processGrayscaleInPlace(pixels) {
    var ptr0 = passArrayF32ToWasm0(pixels, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.processGrayscaleInPlace(ptr0, len0, pixels);
}

/**
 * @param {Float32Array} pixels
 */
export function processInvertInPlace(pixels) {
    var ptr0 = passArrayF32ToWasm0(pixels, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.processInvertInPlace(ptr0, len0, pixels);
}

/**
 * @param {Float32Array} pixels
 * @param {number} amount
 */
export function processSaturationInPlace(pixels, amount) {
    var ptr0 = passArrayF32ToWasm0(pixels, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.processSaturationInPlace(ptr0, len0, pixels, amount);
}

/**
 * @param {Float32Array} pixels
 */
export function processSepiaInPlace(pixels) {
    var ptr0 = passArrayF32ToWasm0(pixels, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.processSepiaInPlace(ptr0, len0, pixels);
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_copy_to_typed_array_db832bc4df7216c1 = function(arg0, arg1, arg2) {
        new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('faux_toe_shop_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
