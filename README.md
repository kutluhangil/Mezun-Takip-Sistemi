<div align="center">

<img src="docs/media/hero.svg" alt="Graduate Tracking System — First and Emergency Aid programme alumni survey" width="100%">

<p>
  <img alt="Status" src="https://img.shields.io/badge/status-in%20planning-c96f4a?style=for-the-badge&labelColor=120c09">
  <img alt="Vercel" src="https://img.shields.io/badge/hosting-Vercel-e8b04a?style=for-the-badge&labelColor=120c09">
  <img alt="Supabase" src="https://img.shields.io/badge/data-Supabase-5f8f7a?style=for-the-badge&labelColor=120c09">
  <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-c96f4a?style=for-the-badge&labelColor=120c09">
</p>

<p><em>An alumni tracking site for the First and Emergency Aid programme at Fenerbahçe University:<br>
where graduates work, how their training served them, and what the programme should change.</em></p>

</div>

<img src="docs/media/divider.svg" width="100%" alt="">

## What it will be

Programmes need to know what happens to their graduates. Today that is a paper or PDF survey that is hard to send, hard to fill and hard to analyse. This project turns it into a small, focused website: graduates sign in with a one-time email code, answer the programme's survey and update it later; the faculty sees the results as live summaries.

<img src="docs/media/divider.svg" width="100%" alt="">

## Decisions so far

| | |
|---|---|
| **Sign-in** | A one-time code sent by email. No passwords to forget. |
| **The survey** | The programme's existing questionnaire, reproduced word for word so results stay comparable. |
| **Stack** | A web app on Vercel with Supabase for auth and data, protected by row-level security. |
| **Look** | A warm clay palette, calm and readable on a phone. |
| **Faculty view** | Aggregated, anonymised results with charts and CSV export. |
| **Privacy** | Only what the survey asks is stored, and graduates can see and update their own answers. |

```mermaid
flowchart LR
  G[Graduate] --> OTP[Email code sign-in]
  OTP --> S[Survey · word for word]
  S --> DB[(Supabase · RLS)]
  DB --> F[Faculty dashboard<br/>summaries · CSV]
```

<img src="docs/media/divider.svg" width="100%" alt="">

## Türkçe özet

**Mezun Takip Sistemi**, Fenerbahçe Üniversitesi İlk ve Acil Yardım Programı mezunlarının nerede çalıştığını, aldıkları eğitimin işlerine ne kadar yaradığını ve programın neyi değiştirmesi gerektiğini öğrenmek için hazırlanan bir anket sitesi. Mezunlar e-postaya gelen tek kullanımlık kodla giriş yapıp programın mevcut anketini birebir dolduracak; bölüm sonuçları özet grafikler olarak görecek. Kararlar: e-posta koduyla giriş, Vercel + Supabase, kil rengi tema, anketin aynen korunması. Şu an planlama aşamasında; öğretmen görüşleri bekleniyor.

<div align="center">
<br>
<a href="https://github.com/kutluhangil"><img src="docs/media/signature.svg" width="100%" alt="Built by kutluhangil"></a>
<sub>In planning · code arrives once the survey questions are confirmed.</sub>
</div>
