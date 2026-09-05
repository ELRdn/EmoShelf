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
});
