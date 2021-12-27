#[no_mangle]
pub extern "C" fn test_i8_sync() -> i8 {
    i8::MIN
}

#[no_mangle]
pub extern "C" fn test_u8_sync() -> u8 {
    u8::MAX
}

#[no_mangle]
pub extern "C" fn test_i16_sync() -> i16 {
    i16::MIN
}

#[no_mangle]
pub extern "C" fn test_u16_sync() -> u16 {
    u16::MAX
}

#[no_mangle]
pub extern "C" fn test_i32_sync() -> i32 {
    i32::MIN
}

#[no_mangle]
pub extern "C" fn test_u32_sync() -> u32 {
    u32::MAX
}

#[no_mangle]
pub extern "C" fn test_pointer_sync() -> *const u8 {
    "Hello, world!".as_ptr()
}
