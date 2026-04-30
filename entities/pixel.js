export class Pixel {
  #color;
  #transparency;

  constructor(b0, b1, b2, b3, transparency) {
    this.#color = (b3 << 3) | (b2 << 2) | (b1 << 1) | b0;
    this.#transparency = transparency;
  }

  static fromIndex(colorIndex, transparent) {
    const pixel = new Pixel(0, 0, 0, 0, transparent ? 1 : 0);
    pixel.#color = colorIndex;
    return pixel;
  }

  get color() {
    return this.#color;
  }

  get transparent() {
    return this.#transparency === 1;
  }
}
