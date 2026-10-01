import type { CSSProperties } from 'react';
import { Button, Card, Input, ListingCard, OptionRow, SegmentedTabs, Select, Stepper, UploadBox, type IconName } from '../../index';
import { OBRAS, type ScreenProps } from './data';

/** Listing page: category tabs + primary action, then a stack of ListingCards. */
export function ObrasScreen({ mobile, go }: ScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <SegmentedTabs tabs={['Todas', 'Em andamento', 'Planejadas', 'Concluídas']} variant="light" />
        <Button iconLeft="plus" onClick={() => go('nova')}>Nova obra</Button>
      </div>
      {OBRAS.map(o => (
        <ListingCard key={o.id} stacked={mobile} title={o.title} status={o.status} onMore={() => {}}
          attrs={[{ label: 'Prazo', value: o.prazo }, { label: 'Local', value: o.local }, { label: 'Área', value: o.area }]}
          featuresLabel="Etapas" features={o.etapas.map(([icon, label]) => ({ icon, label }))} />
      ))}
    </div>
  );
}

const CATS: [IconName, string][] = [['shovel', 'Terraplenagem'], ['construction', 'Estrutura'], ['hammer', 'Alvenaria'], ['zap', 'Elétrica'], ['droplets', 'Hidráulica'], ['layers', 'Laje'], ['paintbrush', 'Acabamento'], ['wrench', 'Estrutura metálica'], ['shield-check', 'Segurança do trabalho']];
const INCL: [IconName, string][] = [['truck', 'Transporte'], ['hard-hat', 'Mão de obra'], ['package', 'Materiais'], ['ruler', 'Projeto executivo'], ['shield-check', 'Seguro'], ['file-text', 'Licenças']];

/** Multi-step form: Stepper, option grids, fields, upload, back/next actions. */
export function NovaObraScreen({ mobile, go }: ScreenProps) {
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,minmax(0,1fr))', columnGap: 'var(--space-12)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card><Stepper steps={4} current={2} /><h2 style={{ margin: 0, fontSize: 'var(--fs-h4)', fontWeight: 'var(--fw-bold)' }}>Sobre esta obra</h2></Card>
      <Card title="Etapas contratadas"><div style={grid}>{CATS.map(([i, l], k) => <OptionRow key={l} icon={i} label={l} defaultChecked={k === 1 || k === 2} />)}</div></Card>
      <Card title="Orçamento">
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 'var(--space-4)' }}>
          <Input label="Valor por m²" required prefix="R$" placeholder="0,00" defaultValue="4.250,00" />
          <Select label="Tipo de obra" required placeholder="Selecione" options={['Residencial', 'Comercial', 'Industrial']} />
        </div>
        <h3 style={{ margin: 'var(--space-2) 0 0', font: 'var(--type-card-title)' }}>O que está incluído no valor?</h3>
        <div style={grid}>{INCL.map(([i, l], k) => <OptionRow key={l} icon={i} label={l} defaultChecked={k < 2} />)}</div>
      </Card>
      <Card title="Fotos do terreno"><UploadBox title="Enviar fotos" formats="JPG ou PNG, até 6 imagens de 5 MB" height={150} /></Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingBottom: 'var(--space-2)' }}>
        <Button variant="secondary" iconLeft="chevron-left" onClick={() => go('obras')}>Voltar</Button>
        <Button iconRight="chevron-right" onClick={() => go('obras')}>Próxima etapa</Button>
      </div>
    </div>
  );
}
