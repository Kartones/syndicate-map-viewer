export class Color {
  #color;
  #transparency;

  constructor(b0, b1, b2, b3, transparency) {
    // Color data bits are also reversed
    this.#color = (b0 << 3) | (b1 << 2) | (b2 << 1) | b3;
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
