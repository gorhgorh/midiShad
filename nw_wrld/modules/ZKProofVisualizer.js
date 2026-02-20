/*
@nwWrld name: ZKProofVisualizer
@nwWrld category: Text
@nwWrld imports: ModuleBase
*/

class ZKProofVisualizer extends ModuleBase {
  static methods = [
    {
      name: "match",
      executeOnLoad: false,
      options: [
        {
          name: "matchCount",
          defaultVal: 6,
          type: "number",
        },
      ],
    },
    {
      name: "style",
      options: [
        { name: "swapInterval", defaultVal: 20, type: "number", min: 5, max: 200 },
        { name: "matchColor1", defaultVal: "#ffff00", type: "color" },
        { name: "matchColor2", defaultVal: "#ff0000", type: "color" },
        { name: "fontSize", defaultVal: 8, type: "number", min: 4, max: 24 },
      ],
    },
  ];

  constructor(container) {
    super(container);

    this.name = ZKProofVisualizer.name;
    this.columns = [];
    this.pairs = new Map();
    this.isAnimating = false;
    this.lastSwapTime = 0;
    this.swapInterval = 20;
    this.matchColor1 = "yellow";
    this.matchColor2 = "red";
    this.fontSize = 8;

    this.init();
  }

  init() {
    const wordPairs = [
      ["Ψ(x₁, t₀) = Σe^(-x₁²)", "Ξ(x₁, t₀) = √π/(2t₀)"],
      ["ℤₙ = ⌊Φ(k)²/Ψ(k)⌋", "Λₙ = ⌊(Φ(k)² − Ψ(k))⌋"],
      ["F₀(x) = ∫₀ⁿ e^(-kx) dx", "H₀(x) = (1 − e^(-kx))/k"],
      ["Σ{𝔼[X]} = Nμ", "Σ{𝔼[Y]} = Nμ"],
      ["f'(x) = lim(h→0)(f(x+h)−f(x))/h", "∂f/∂x = (f(x+h)−f(x))/h as h→0"],
      ["|A| = det(A)", "|B| = det(B) where B ≡ Aᵀ"],
      ["P(A ∩ B) = P(A)P(B)", "P(A|B)P(B) = P(A ∩ B)"],
      ["H(X) = -Σp(x)log₂p(x)", "H(Y) = -Σq(y)log₂q(y)"],
      ["Σf(i) = i(i+1)/2", "Σg(j) = j(j+1)/2"],
      ["aₙ = rⁿ/(1 − r)", "Sₙ = rⁿ/(1 − r) for |r| < 1"],
      ["∂²u/∂t² = c²∇²u", "u(x, t) = sin(kx−ωt) satisfies"],
      ["λ₁ = 1/n Σ(x−x̄)²", "σ² = λ₁ for unbiased estimator"],
      ["E[X] = ∫x f(x)dx", "⟨X⟩ = ∫x f(x)dx"],
      ["p(x) = (e^(-λ)λ^x)/x!", "P(X=x) = (e^(-λ)λ^x)/x!"],
      ["e^(ix) = cos(x) + i sin(x)", "cis(x) = cos(x) + i sin(x)"],
    ];

    wordPairs.forEach(([word1, word2]) => {
      this.pairs.set(word1, word2);
      this.pairs.set(word2, word1);
    });

    const html = `
      <div
      class="font-monospace" 
      style="
        display: flex;
        justify-content: space-around;
        align-items: center;
        width: 100%;
        height: 100%;
        font-family: monospace;
        overflow: hidden;
        font-size: 8px;
      ">
        ${Array(1)
          .fill()
          .map(
            () => `
          <div class="zkp-column" style="
            margin: 4px;
            padding: 8px;
            overflow: hidden;
            position: relative;
            width: 100%;
          "></div>
        `
          )
          .join("")}
      </div>
    `;

    this.elem.insertAdjacentHTML("beforeend", html);
    this.columns = Array.from(this.elem.querySelectorAll(".zkp-column"));

    this.initializeColumns();
    this.startRapidAnimation();
  }

  initializeColumns() {
    this.columns.forEach((column) => {
      const allWords = [];
      Array.from(this.pairs.keys()).forEach((word) => {
        allWords.push(word);
        allWords.push(this.pairs.get(word));
      });

      const columnWords = Array(60)
        .fill()
        .map(() => allWords[Math.floor(Math.random() * allWords.length)]);

      columnWords.forEach((word) => {
        const wordWrapper = document.createElement("div");
        wordWrapper.style.cssText = `
              width: 100%;
              display: block;
              padding: 4px;
              margin: 2px;
          `;

        const wordElem = document.createElement("div");
        wordElem.textContent = word;
        wordElem.style.cssText = `
              transition: all 0ms;
              color: #fff;
              display: inline;
          `;

        wordWrapper.appendChild(wordElem);
        column.appendChild(wordWrapper);
      });
    });
  }

  startRapidAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const swapWords = () => {
      const currentTime = performance.now();

      if (currentTime - this.lastSwapTime >= this.swapInterval) {
        this.columns.forEach((column) => {
          for (let i = 0; i < 5; i++) {
            const words = Array.from(column.children);
            const idx1 = Math.floor(Math.random() * words.length);
            const idx2 = Math.floor(Math.random() * words.length);

            if (idx1 !== idx2) {
              const word1 = words[idx1];
              const word2 = words[idx2];

              if (idx1 < idx2) {
                column.insertBefore(word2, word1);
                column.insertBefore(word1, words[idx2 + 1]);
              } else {
                column.insertBefore(word1, word2);
                column.insertBefore(word2, words[idx1 + 1]);
              }
            }
          }
        });

        this.lastSwapTime = currentTime;
      }

      if (this.isAnimating) {
        requestAnimationFrame(swapWords);
      }
    };

    requestAnimationFrame(swapWords);
  }

  match({ matchCount = 6 } = {}) {
    const column = this.columns[0];
    const allWords = Array.from(column.querySelectorAll(".zkp-column div div"));
    const parsed = Math.floor(Number(matchCount));
    const fallback = 6;
    const requested = Number.isFinite(parsed) ? parsed : fallback;
    const maxPairs = Math.floor(allWords.length / 2);
    const safeMatchCount = Math.max(0, Math.min(requested, maxPairs));
    const usedWords = new Set();
    const matches = [];

    while (
      matches.length < safeMatchCount &&
      usedWords.size < allWords.length
    ) {
      const word = allWords[Math.floor(Math.random() * allWords.length)];
      const wordText = word.textContent;

      if (!usedWords.has(wordText)) {
        const pairText = this.pairs.get(wordText);
        const pairElement = allWords.find(
          (el) => el.textContent === pairText && !usedWords.has(el.textContent)
        );

        if (pairElement) {
          matches.push([word, pairElement]);
          usedWords.add(wordText);
          usedWords.add(pairText);
        }
      }
    }

    matches.forEach(([word1, word2]) => {
      word1.style.background = this.matchColor1;
      word2.style.background = this.matchColor2;
    });

    setTimeout(() => {
      matches.forEach(([word1, word2]) => {
        word1.style.background = "transparent";
        word2.style.background = "transparent";
      });
    }, 75);
  }

  style({ swapInterval = 20, matchColor1 = "#ffff00", matchColor2 = "#ff0000", fontSize = 8 } = {}) {
    this.swapInterval = swapInterval;
    this.matchColor1 = matchColor1;
    this.matchColor2 = matchColor2;
    this.fontSize = fontSize;
    const container = this.elem.querySelector(".font-monospace");
    if (container) container.style.fontSize = this.fontSize + "px";
  }

  destroy() {
    this.isAnimating = false;
    this.columns = [];
    this.pairs.clear();
    super.destroy();
  }
}

export default ZKProofVisualizer;
