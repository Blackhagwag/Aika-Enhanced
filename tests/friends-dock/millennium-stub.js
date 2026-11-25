// TEST FIXTURE ONLY — never loaded by the theme. A stand-in for Millennium's backend bridge
// (window.__private_millennium_ffi_do_not_use__, answered through the binder's __handleResponse,
// as Millennium's core IPC does), with the calls Aika Enhanced makes: Core_GetStartConfig (the
// active theme with its skin.json and the saved conditions), Core_ChangeCondition,
// Core_GetThemeColorOptions, Core_ChangeColor. Every call is logged in window.__millennium.calls.
const NATIVE = "Aika-Enhanced";
const skin = await (await fetch("../../skin.json")).json();
const state = {
  calls: [],
  conditions: { "Color preset": "Aika", "Dock width": "264" },
  colors: {
    "--aika-user-accent": "#8B7FF0", "--aika-user-accent-bright": "#A497F5",
    "--aika-user-light-1": "#8B7FF0", "--aika-user-light-2": "#C77DBA", "--aika-user-light-3": "#D9906A",
  },
};
const NAMES = {
  "--aika-user-accent": "Accent", "--aika-user-accent-bright": "Accent hover",
  "--aika-user-light-1": "Light: main", "--aika-user-light-2": "Light: pink", "--aika-user-light-3": "Light: warm",
};
const methods = {
  Core_GetStartConfig: () => ({
    active_theme: { native: NATIVE, data: skin },
    conditions: { [NATIVE]: { ...state.conditions } },
  }),
  Core_ChangeCondition: ({ theme, newData, condition }) => {
    if (theme === NATIVE) state.conditions[condition] = newData;
    return { success: true };
  },
  Core_GetThemeColorOptions: () => Object.entries(state.colors).map(([color, hex]) => ({
    color, name: NAMES[color], description: "", type: 1, hex, defaultColor: hex,
  })),
  Core_ChangeColor: ({ color_name, new_color }) => { state.colors[color_name] = new_color; return new_color; },
};
window.__private_millennium_ffi_do_not_use__ = (json) => {
  const msg = JSON.parse(json);
  const { methodName, argumentList } = msg.data;
  state.calls.push([methodName, argumentList]);
  const fn = methods[methodName];
  setTimeout(() => {
    const binder = window.MILLENNIUM_PRIVATE_INTERNAL_FOREIGN_FUNCTION_INTERFACE_DO_NOT_USE;
    binder?.__handleResponse(msg.call_id, fn
      ? { success: true, returnJson: fn(argumentList || {}) }
      : { success: false, returnJson: `Function not found: ${methodName}` });
  }, 5);
};
window.__millennium = state;
