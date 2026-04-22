import { generatePDF } from '../src/lib/pdf/generator'
import { writeFileSync } from 'fs'
import { join } from 'path'

const SAMPLE = `CABEÇALHO

Maria Silva dos Santos

CONTATO

São Paulo, SP | (11) 98765-4321 | maria.silva@email.com | linkedin.com/in/mariasilva

DISPONIBILIDADE

Disponível para recolocação imediata. Aberta a trabalho remoto, híbrido ou presencial.

FERRAMENTAS

Design & Mídia: Canva, Adobe Photoshop, Capcut
Gestão: Trello, Notion, Google Workspace
Tráfego Pago: Meta Ads, Google Ads
Atendimento: Zendesk, WhatsApp Business

PRAZER, MARIA.

Prefiro entender o problema antes de sair correndo atrás da solução.

Sou a pessoa que prefere entender o problema antes de sair correndo atrás da solução. Gosto de ambientes onde as perguntas valem tanto quanto as respostas, e onde o processo importa tanto quanto o resultado.

Cresci profissionalmente em empresas pequenas, onde a operação vai além do cargo. Isso me deixou com uma forma de trabalhar que mistura execução com pensamento — raramente faço só uma coisa de cada vez, e raramente entrego sem refletir.

EXPERIÊNCIA PROFISSIONAL

Analista de Marketing
Empresa XYZ — São Paulo, SP
Jan/2021 – Atual
Responsável pelo planejamento e execução de campanhas digitais. Gestão de redes sociais, produção de conteúdo para blog e newsletter com foco em conversão orgânica.

Assistente Administrativo
ABC Consultoria — Campinas, SP
Mar/2019 – Dez/2020
Apoio às áreas de RH e financeiro com controle de planilhas, agendamentos e atendimento a fornecedores. Implementou rotina de controle que reduziu erros de lançamento em 40%.

Vendedora
Negócio familiar — São Paulo, SP
Jan/2017 – Fev/2019
Atendimento ao cliente e gestão do caixa em loja de varejo. Responsável pela abertura e fechamento do caixa diário.

FORMAÇÃO E CURSOS

Graduação em Comunicação Social — Universidade Mackenzie | 2018 – 2022
Curso de Marketing Digital — Rock Content | 2021
Excel Avançado — Fundação Bradesco | 2020

INFORMAÇÕES ADICIONAIS RELEVANTES

CNH categoria B
Inglês intermediário (leitura e escrita)
Portfólio: behance.net/mariasilva`

async function main() {
  const buffer = await generatePDF(SAMPLE)
  const out = join(process.cwd(), 'scripts', 'preview.pdf')
  writeFileSync(out, buffer)
  console.log(`PDF gerado: ${out}`)
}

main().catch(console.error)
