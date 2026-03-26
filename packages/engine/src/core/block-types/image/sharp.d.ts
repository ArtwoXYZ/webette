declare module "sharp" {
  type SharpInstance = any;
  interface SharpModule {
    (input?: any): SharpInstance;
    default?: SharpModule;
  }
  const sharp: SharpModule;
  export = sharp;
}
