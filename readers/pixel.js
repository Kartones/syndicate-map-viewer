export class Pixel {
  #color;
  #transparency;

  constructor(b0, b1, b2, b3, transparency) {
    this.#color = (b3 << 3) | (b2 << 2) | (b1 << 1) | b0;
    this.#transparency = transparency;
  }

  get color() {
    return this.#color;
  }

  get transparent() {
    return this.#transparency === 1;
  }

  toString() {
    return `[${this.#color.toString().padStart(2, "0")} ${
      this.transparent ? "T" : " "
    }]`;
  }
}
