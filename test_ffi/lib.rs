#[no_mangle]
pub extern "C" fn test_sync() -> i8 {
  1
}

#[no_mangle]
pub extern "C" fn test_buffer() -> f64 {
  println!("helloooo");
  let ptr = [1, 2, 3, 4, 5, 6, 7, 8].as_ptr();
  println!("Ptr is {:?}", ptr);
  123.123
}
