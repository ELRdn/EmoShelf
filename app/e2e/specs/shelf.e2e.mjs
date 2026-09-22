describe("EmoShelf desktop shell", () => {
  it("boots the real Tauri window and exposes the v1 shelf", async () => {
    const title = await $(".titlebar strong");
    await title.waitForDisplayed();
    await expect(title).toHaveText("EmoShelf");
    await expect($(".version-pill")).toHaveText("v1.0");

    const onboarding = await $(".welcome-panel");
    if (await onboarding.isExisting()) {
      await $(".onboarding-actions .text-button").click();
    }

    const practice = await $(".practice-panel");
    if (await practice.isExisting()) await browser.keys("Escape");
    const search = await $('input[type="search"]');
    await search.waitForDisplayed();
    await expect($("nav.board-tabs")).toBeDisplayed();
    await expect($("#main-content")).toBeDisplayed();

    if (process.env.EMOSHELF_E2E_SCREENSHOT) {
      const browseButton = await $(".shelf-empty .primary-button");
      if (await browseButton.isExisting()) {
        await browseButton.click();
        await $(".virtual-grid-scroll button").waitForDisplayed();
      }
      await browser.pause(500);
      await browser.saveScreenshot(process.env.EMOSHELF_E2E_SCREENSHOT);
    }
  });

  it("supports the keyboard-first search workflow", async () => {
    await browser.keys(["Control", "f"]);
    const search = await $('input[type="search"]');
    await expect(search).toBeFocused();
    await search.setValue("rocket");
    const firstResult = await $(".virtual-grid-scroll button");
    await firstResult.waitForDisplayed();
    await expect(firstResult).toHaveAttribute("data-catalog-index");
    await browser.keys("Escape");
    await expect(search).toHaveValue("");
  });

  it("keeps essential landmarks and content inside the viewport", async () => {
    await expect($("header.titlebar")).toBeDisplayed();
    await expect($("main#main-content")).toBeDisplayed();
    await expect($("footer.utility-footer")).toBeDisplayed();
    const overflows = await browser.execute(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });

  it("opens all emoji from the leftmost tab and resets search and category filters", async () => {
    const all = await $(".board-tab");
    await expect(all).toHaveText("▦All");
    await all.click();
    await expect(all).toHaveAttribute("aria-current", "page");
    await $(".virtual-grid-scroll button").waitForDisplayed();
    const count = await $(".panel-label > span").getText();
    await $(".category-strip button:nth-child(3)").click();
    await $('input[type="search"]').setValue("rocket");
    await all.click();
    await expect($('input[type="search"]')).toHaveValue("");
    await expect($(".panel-label > span")).toHaveText(count);
    await expect($(".category-strip button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect($("[data-board-id]")).not.toHaveAttribute("aria-current");
    await $("[data-board-id]").click();
    await expect($("[data-board-id]")).toHaveAttribute("aria-current", "page");
    await expect(all).not.toHaveAttribute("aria-current");
    await expect($(".category-strip")).not.toExist();
  });

  it("keeps the shelf wide until details are requested", async () => {
    const details = await $('[aria-controls="selection-details"]');
    await expect(details).toHaveAttribute("aria-expanded", "false");
    await details.click();
    await expect($("#selection-details")).toBeDisplayed();
    await details.click();
    await expect(details).toHaveAttribute("aria-expanded", "false");
  });

  it("offers private local practice and restores keyboard focus", async () => {
    const help = await $(".utility-footer .quiet-button");
    await help.click();
    const field = await $("#practice-text");
    await field.waitForDisplayed();
    await $(".practice-emojis button").click();
    await expect(field).toHaveValue("😎");
    await browser.keys("Escape");
    await expect(help).toBeFocused();
    // Embedded key events do not reliably trigger native button activation.
    // Physical Enter activation is checked separately on the acceptance build.
    await help.click();
    await expect($("#practice-text")).toHaveValue("");
    await browser.keys("Escape");
  });

  it("adds an inspected search result and restores it from native storage", async () => {
    await browser.keys(["Control", "f"]);
    const search = await $('input[type="search"]');
    await search.setValue("rocket");
    await $(".virtual-grid-scroll button").waitForDisplayed();
    // Embedded driver drops ctrlKey on named Enter. Ctrl+Enter is covered by
    // component tests and the physical keyboard acceptance matrix, not a fake event here.
    await $('[aria-controls="selection-details"]').click();
    await $(".virtual-grid-scroll button").click();
    await $(".shelf-action").click();
    await $('[aria-controls="selection-details"]').click();
    await browser.keys("Escape");
    await browser.keys("Escape");
    await $("[data-board-id]").click();

    await $(".shelf-grid button").waitForDisplayed();
    const items = await $$(".shelf-grid button");
    expect(items.length).toBeGreaterThan(0);
    // Read the isolated native state until the scheduled save is durable.
    await browser.waitUntil(async () =>
      browser.execute(async () => {
        const content = await window.__TAURI_INTERNALS__.invoke("load_state");
        return JSON.parse(content).boards.some((board) =>
          board.items.some((item) => item.payload === "🚀"),
        );
      }),
    );
    await browser.refresh();
    await $(".shelf-grid button").waitForDisplayed();
  });

  it("keeps search, shelf and footer usable at the minimum window size", async () => {
    await browser.setWindowSize(480, 320);
    await browser.waitUntil(async () =>
      browser.execute(() => window.innerWidth <= 480),
    );
    const layout = await browser.execute(() => {
      const selectors = [
        'input[type="search"]',
        ".utility-footer",
        ".shelf-grid",
      ];
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        visible: selectors.every((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.bottom <= window.innerHeight
          );
        }),
      };
    });
    expect(layout).toEqual({ overflow: false, visible: true });
    await browser.setWindowSize(880, 660);
  });

  it("keeps English All navigation and window controls inside the viewport", async () => {
    await $(".settings-button").click();
    await browser.execute(() => {
      const select = document.querySelector('select:has(option[value="en"])');
      select.value = "en";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await browser.keys("Escape");
    await $(".board-tab").click();
    await $(".virtual-grid-scroll button").waitForDisplayed();
    for (const width of [880, 480]) {
      await browser.setWindowSize(width, 660);
      await browser.waitUntil(async () =>
        browser.execute((limit) => window.innerWidth <= limit, width),
      );
      const clipped = await browser.execute(() =>
        [
          ".titlebar",
          ".window-controls",
          ".shelf-app",
          ".main-search",
          ".category-strip",
          ".main-panel",
          ".utility-footer",
        ].filter((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return rect.left < 0 || rect.right > window.innerWidth + 1;
        }),
      );
      expect(clipped).toEqual([]);
    }
    await browser.setWindowSize(880, 660);
    await $(".settings-button").click();
    await browser.execute(() => {
      const select = document.querySelector('select:has(option[value="en"])');
      select.value = "system";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await browser.keys("Escape");
  });

  it("centers native emoji text even when its glyph advance exceeds the image slot", async () => {
    // The embedded driver selects option nodes without dispatching change.
    // Set up this geometry test through the real React change handler; this
    // does not claim to test physical interaction with the OS select popup.
    const setRenderer = (value) =>
      browser.execute((next) => {
        const select = document.querySelector(
          'select:has(option[value="native"])',
        );
        select.value = next;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }, value);
    await $(".settings-button").click();
    const renderer = await $('select:has(option[value="native"])');
    await setRenderer("native");
    await expect(renderer).toHaveValue("native");
    await browser.keys("Escape");
    await $(".board-tab").click();
    await $(".emoji-native").waitForDisplayed();
    const offsets = await browser.execute(() =>
      Array.from(
        document.querySelectorAll(".virtual-grid-scroll .emoji-native"),
      )
        .slice(0, 10)
        .map((element) => {
          const slot = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          return Math.abs(text.x + text.width / 2 - slot.x - slot.width / 2);
        }),
    );
    // Virtualized item count changes with the restored viewport and font size.
    expect(offsets.length).toBeGreaterThan(0);
    expect(Math.max(...offsets)).toBeLessThan(0.75);
    await $(".settings-button").click();
    await setRenderer("twemoji");
    await browser.keys("Escape");
    await $("[data-board-id]").click();
  });

  it("reopens after minimize and close without hiding on repeated reveal", async () => {
    const nativeState = () =>
      browser.execute(async () => {
        const invoke = window.__TAURI_INTERNALS__.invoke;
        return {
          visible: await invoke("plugin:window|is_visible", { label: "main" }),
          minimized: await invoke("plugin:window|is_minimized", {
            label: "main",
          }),
          focused: await invoke("plugin:window|is_focused", { label: "main" }),
        };
      });
    const reveal = async () => {
      await browser.execute(() =>
        window.__TAURI_INTERNALS__.invoke("reveal_shelf_for_test"),
      );
      await browser.waitUntil(async () => {
        const state = await nativeState();
        // Embedded IPC is not a physical hotkey and Windows may refuse focus.
        // Foreground/keyboard acceptance is tested separately with real Alt+E.
        return state.visible && !state.minimized;
      });
    };
    // Test the actual UI commands and native state. Component mocks cannot
    // detect missing Tauri permissions or a reentrant Windows message deadlock.
    for (let repeat = 0; repeat < 3; repeat += 1) {
      await reveal();
      await $(".window-controls button:nth-child(2)").click();
      await browser.waitUntil(async () => (await nativeState()).minimized, {
        timeoutMsg: "The minimize button did not minimize the native window",
      });
      await reveal();
      await reveal();
      await $(".window-controls button:last-child").click();
      await browser.waitUntil(async () => !(await nativeState()).visible, {
        timeoutMsg: "The close button did not hide the native window",
      });
      await reveal();
      await $('input[type="search"]').setValue("rocket");
      await $(".virtual-grid-scroll button").waitForDisplayed();
      await browser.keys("Escape");
    }
  });
});
