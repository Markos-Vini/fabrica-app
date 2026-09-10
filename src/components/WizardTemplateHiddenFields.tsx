import type { DomainFormDefaults } from "@/lib/domain-templates";
import type { UiStyle } from "@/lib/visual-design";

type Props = {
  defaults: DomainFormDefaults;
  uiStyle: UiStyle;
  primaryColor: string;
};

/** Campos do template enviados quando o wizard MVP pula etapas detalhadas. */
export function WizardTemplateHiddenFields({
  defaults,
  uiStyle,
  primaryColor,
}: Props) {
  return (
    <>
      <input type="hidden" name="uiStyle" value={uiStyle} />
      <input type="hidden" name="primaryColor" value={primaryColor} />
      <input type="hidden" name="uiReference" value={defaults.uiReference} />
      <input type="hidden" name="mvpEssentials" value={defaults.mvpEssentials} />
      <input type="hidden" name="mvpLater" value={defaults.mvpLater} />
      <input type="hidden" name="mainFlows" value={defaults.mainFlows} />
      <input type="hidden" name="userRolesCustom" value={defaults.userRolesCustom} />
      <input type="hidden" name="screensCustom" value={defaults.screensCustom} />
      <input type="hidden" name="successCriteria" value={defaults.successCriteria} />
      <input type="hidden" name="nfrOffline" value={defaults.nfrOffline} />
      <input type="hidden" name="nfrSync" value={defaults.nfrSync} />
      <input type="hidden" name="nfrScale" value={defaults.nfrScale} />
      <input type="hidden" name="nfrLocales" value={defaults.nfrLocales} />
      <input type="hidden" name="nfrPrivacy" value={defaults.nfrPrivacy} />
      <input type="hidden" name="nfrNotes" value={defaults.nfrNotes} />
      <input type="hidden" name="integrationsCustom" value={defaults.integrationsCustom} />
      <input type="hidden" name="entitiesCustom" value={defaults.entitiesCustom} />
      <input type="hidden" name="entityRelations" value={defaults.entityRelations} />
      {defaults.userRoles.map((id) => (
        <input key={`ur-${id}`} type="hidden" name={`userRole_${id}`} value="on" />
      ))}
      {defaults.screens.map((id) => (
        <input key={`sc-${id}`} type="hidden" name={`screen_${id}`} value="on" />
      ))}
      {defaults.integrations.map((id) => (
        <input key={`int-${id}`} type="hidden" name={`integration_${id}`} value="on" />
      ))}
      {defaults.entities.map((id) => (
        <input key={`ent-${id}`} type="hidden" name={`entity_${id}`} value="on" />
      ))}
    </>
  );
}
