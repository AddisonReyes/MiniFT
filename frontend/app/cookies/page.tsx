"use client";

import { useTranslation } from "react-i18next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export default function CookiesPage() {
  const { t } = useTranslation();
  const sections: LegalSection[] = [
    {
      title: t("legal.cookies.sections.what.title"),
      body: [
        t("legal.cookies.sections.what.body1"),
        t("legal.cookies.sections.what.body2"),
      ],
    },
    {
      title: t("legal.cookies.sections.essential.title"),
      body: [
        t("legal.cookies.sections.essential.body1"),
        t("legal.cookies.sections.essential.body2"),
      ],
    },
    {
      title: t("legal.cookies.sections.thirdParty.title"),
      body: [
        t("legal.cookies.sections.thirdParty.body1"),
        t("legal.cookies.sections.thirdParty.body2"),
      ],
    },
    {
      title: t("legal.cookies.sections.controls.title"),
      body: [
        t("legal.cookies.sections.controls.body1"),
        t("legal.cookies.sections.controls.body2"),
      ],
    },
  ];

  return (
    <LegalPage
      eyebrow={t("legal.cookies.eyebrow")}
      title={t("legal.cookies.title")}
      effectiveDate={t("legal.effectiveDate")}
      intro={t("legal.cookies.intro")}
      sections={sections}
    />
  );
}
