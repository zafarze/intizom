import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationRU from './locales/ru/translation.json';
import translationTG from './locales/tg/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
	ru: {
		translation: translationRU,
	},
	tg: {
		translation: translationTG,
	},
	en: {
		translation: translationEN,
	},
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'ru',
		debug: import.meta.env.DEV,
		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		},
	});

export default i18n;
