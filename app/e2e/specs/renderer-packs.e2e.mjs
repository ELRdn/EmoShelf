import path from "node:path";

// Release qualification passes the signed packs built for this release.
const packDirectory = process.env.EMOSHELF_E2E_RENDERER_PACKS;
const packRenderers = ["fluent", "noto", "openmoji"];

const invoke = (command, args) =>
  browser.executeAsync(
    (name, payload, done) => {
      window.__TAURI_INTERNALS__.invoke(name, payload).then(
        (value) => done({ value }),
        (error) => done({ error: String(error) }),
      );
    },
    command,
    args,
  );

// The embedded driver selects option nodes without dispatching change.
const setRenderer = (value) =>
  browser.execute((next) => {
    const select = document.querySelector('select:has(option[value="native"])');
    select.value = next;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);

const openShelf = async () => {
  await $(".titlebar strong").waitForDisplayed();
  const onboarding = await $(".welcome-panel");
  if (await onboarding.isExisting()) {
    await $(".onboarding-actions .text-button").click();
  }
  if (await $(".practice-panel").isExisting()) await browser.keys("Escape");
  await $('input[type="search"]').waitForDisplayed();
};

(packDirectory ? describe : describe.skip)("signed emoji style packs", () => {
  it("installs, renders, persists and removes every release pack", async () => {
    await openShelf();
    for (const rendererId of packRenderers) {
      const installed = await invoke("install_renderer_pack", {
        path: path.join(
          packDirectory,
          `EmoShelf-${rendererId}-1.0.0.emoshelf-renderer`,
        ),
      });
      expect(installed.error).toBeUndefined();
      expect(installed.value.rendererId).toBe(rendererId);

      await browser.refresh();
      await openShelf();
      await $(".settings-button").click();
      await setRenderer(rendererId);
      await expect($('select:has(option[value="native"])')).toHaveValue(
        rendererId,
      );
      await browser.keys("Escape");
      await $('input[type="search"]').setValue("face");
      await browser.waitUntil(
        async () =>
          (await browser.execute(
            () =>
              [...document.querySelectorAll(".virtual-grid-scroll img")].filter(
                (image) =>
                  image.src.startsWith("data:image/svg+xml") &&
                  image.naturalWidth > 0,
              ).length,
          )) >= 10,
        { timeoutMsg: `${rendererId} artwork did not render` },
      );
      await browser.keys("Escape");
    }

    await browser.refresh();
    await openShelf();
    const listed = await invoke("list_renderer_packs", {});
    expect(listed.value.map((pack) => pack.rendererId).sort()).toEqual(
      packRenderers,
    );
    await $(".settings-button").click();
    await expect($('select:has(option[value="native"])')).toHaveValue(
      "openmoji",
    );

    // Leave the shelf spec with the bundled default artwork.
    await setRenderer("twemoji");
    await browser.keys("Escape");
    for (const rendererId of packRenderers) {
      const removed = await invoke("remove_renderer_pack", { rendererId });
      expect(removed.value).toBe(true);
    }
    expect((await invoke("list_renderer_packs", {})).value).toEqual([]);
  });
});
