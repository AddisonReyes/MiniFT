import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import es from "./es.json";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en", "es"],
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
