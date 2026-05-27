"use client";

import { useTranslation } from "react-i18next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections: LegalSection[] = [
    {
      title: t("legal.privacy.sections.collection.title"),
      body: [
        t("legal.privacy.sections.collection.body1"),
        t("legal.privacy.sections.collection.body2"),
      ],
    },
    {
      title: t("legal.privacy.sections.use.title"),
      body: [
        t("legal.privacy.sections.use.body1"),
        t("legal.privacy.sections.use.body2"),
      ],
    },
    {
      title: t("legal.privacy.sections.sharing.title"),
      body: [
        t("legal.privacy.sections.sharing.body1"),
        t("legal.privacy.sections.sharing.body2"),
      ],
    },
    {
      title: t("legal.privacy.sections.controls.title"),
      body: [
        t("legal.privacy.sections.controls.body1"),
        t("legal.privacy.sections.controls.body2"),
      ],
    },
    {
      title: t("legal.privacy.sections.security.title"),
      body: [
        t("legal.privacy.sections.security.body1"),
        t("legal.privacy.sections.security.body2"),
      ],
    },
  ];

  return (
    <LegalPage
      eyebrow={t("legal.privacy.eyebrow")}
      title={t("legal.privacy.title")}
      effectiveDate={t("legal.effectiveDate")}
      intro={t("legal.privacy.intro")}
      sections={sections}
    />
  );
}
