declare module 'pptxgenjs' {
  class PptxGenJS {
    addSlide(): any;
    write(options: { outputType: string }): Promise<Buffer>;
  }
  export default PptxGenJS;
}
