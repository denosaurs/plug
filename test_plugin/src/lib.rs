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
pub extern "C" fn test_c_string_sync() -> *const u8 {
    "Hello, world!".as_ptr()
}

#[repr(C)]
pub struct TestStruct {
    a: u32,
    b: u32,
    c: u32,
    d: u32
}

#[no_mangle]
pub extern "C" fn test_struct_sync() -> *mut TestStruct {
    let test_struct = TestStruct {
        a: 1,
        b: 2,
        c: 3,
        d: 4
    };
    Box::into_raw(Box::new(test_struct))
}
