// electrobun's shipped .ts sources import "three" without type declarations;
// declare it as any so typecheck passes (we don't use three ourselves).
declare module "three";
