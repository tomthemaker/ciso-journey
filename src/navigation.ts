/** Hash-only navigation refreshes on static Pages without a server-side route. */
export function bindNavigation(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
  function showSection(): void {
    const requested = location.hash.slice(1).split("/")[0];
    const section = tabs.some((tab) => tab.dataset.tab === requested)
      ? requested
      : "roadmap";
    tabs.forEach((tab) =>
      tab.classList.toggle("active", tab.dataset.tab === section),
    );
    document
      .querySelectorAll<HTMLElement>(".view")
      .forEach((view) => view.classList.toggle("active", view.id === section));
  }
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      location.hash = tab.dataset.tab ?? "roadmap";
      showSection();
    }),
  );
  window.addEventListener("hashchange", showSection);
  showSection();
}
