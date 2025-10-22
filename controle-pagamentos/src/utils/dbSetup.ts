import { supabase } from '../config/supabase';

const createTables = async () => {
  try {
    console.log('Iniciando criação das tabelas...');

    // Criando tabela de administradores
    console.log('Criando tabela de administradores...');
    await supabase.rpc('exec_sql', {
      query: `
      create table if not exists administrators (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null,
        name text not null,
        email text not null,
        is_super_admin boolean default false,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null,
        constraint fk_user
          foreign key (user_id)
          references auth.users (id)
      );

      alter table administrators enable row level security;

      drop policy if exists "Admins can view all administrators" on administrators;
      create policy "Admins can view all administrators"
        on administrators for select
        to authenticated
        using (true);

      drop policy if exists "Super admins can insert administrators" on administrators;
      create policy "Super admins can insert administrators"
        on administrators for insert
        to authenticated
        with check (exists (
          select 1 from administrators
          where user_id = auth.uid()
          and is_super_admin = true
        ));

      drop policy if exists "Super admins can update administrators" on administrators;
      create policy "Super admins can update administrators"
        on administrators for update
        to authenticated
        using (exists (
          select 1 from administrators
          where user_id = auth.uid()
          and is_super_admin = true
        ));
    `
    }).then(result => {
      if (result.error) {
        throw new Error(`Erro ao criar tabela administrators: ${result.error.message}`);
      }
      console.log('Tabela administrators criada com sucesso!');
    });

    // Criando tabela de grupos
    console.log('Criando tabela de grupos...');
    await supabaseAdmin.rpc('exec_sql', {
      query: `
      create table if not exists groups (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        description text,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null
      );

      alter table groups enable row level security;

      drop policy if exists "Authenticated users can view groups" on groups;
      create policy "Authenticated users can view groups"
        on groups for select
        to authenticated
        using (
          exists (
            select 1 from administrators
            where user_id = auth.uid()
          )
        );

      drop policy if exists "Super admins can manage groups" on groups;
      create policy "Super admins can manage groups"
        on groups for all
        to authenticated
        using (exists (
          select 1 from administrators
          where user_id = auth.uid()
          and is_super_admin = true
        ));

      drop policy if exists "Admins can manage their groups" on groups;
      create policy "Admins can manage their groups"
        on groups for all
        to authenticated
        using (exists (
          select 1 from administrators
          where user_id = auth.uid()
        ));
    `
    }).then(result => {
      if (result.error) {
        throw new Error(`Erro ao criar tabela groups: ${result.error.message}`);
      }
      console.log('Tabela groups criada com sucesso!');
    });

    // Criando tabela de group_administrators
    console.log('Criando tabela de group_administrators...');
    await supabaseAdmin.rpc('exec_sql', {
      query: `
      create table if not exists group_administrators (
        id uuid primary key default gen_random_uuid(),
        group_id uuid not null,
        administrator_id uuid not null,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null,
        constraint fk_group
          foreign key (group_id)
          references groups (id),
        constraint fk_administrator
          foreign key (administrator_id)
          references administrators (id),
        constraint unique_group_administrator
          unique (group_id, administrator_id)
      );

      alter table group_administrators enable row level security;

      drop policy if exists "Authenticated users can view group_administrators" on group_administrators;
      create policy "Authenticated users can view group_administrators"
        on group_administrators for select
        to authenticated
        using (true);

      drop policy if exists "Super admins can manage group_administrators" on group_administrators;
      create policy "Super admins can manage group_administrators"
        on group_administrators for all
        to authenticated
        using (exists (
          select 1 from administrators
          where user_id = auth.uid()
          and is_super_admin = true
        ));

      drop policy if exists "Admins can manage their group_administrators" on group_administrators;
      create policy "Admins can manage their group_administrators"
        on group_administrators for all
        to authenticated
        using (exists (
          select 1 from administrators
          where user_id = auth.uid()
        ));
    `
    }).then(result => {
      if (result.error) {
        throw new Error(`Erro ao criar tabela group_administrators: ${result.error.message}`);
      }
      console.log('Tabela group_administrators criada com sucesso!');
    });

    // Criando tabela de alunos
    console.log('Criando tabela de alunos...');
    await supabaseAdmin.rpc('exec_sql', {
      query: `
      drop table if exists students;
      create table if not exists students (
        id uuid primary key default gen_random_uuid(),
        group_id uuid not null,
        name text not null,
        email text,
        phone text,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null,
        constraint fk_group
          foreign key (group_id)
          references groups (id)
      );

      alter table students enable row level security;

      drop policy if exists "Admins can view their students" on students;
      create policy "Admins can view their students"
        on students for select
        to authenticated
        using (
          exists (
            select 1 from administrators
            where user_id = auth.uid()
          )
        );

      drop policy if exists "Admins can manage their students" on students;
      create policy "Admins can manage their students"
        on students for all
        to authenticated
        using (
          exists (
            select 1 from administrators
            where user_id = auth.uid()
          )
        );
    `
    }).then(result => {
      if (result.error) {
        throw new Error(`Erro ao criar tabela students: ${result.error.message}`);
      }
      console.log('Tabela students criada com sucesso!');
    });

    // Criando tabela de planos de pagamento
    console.log('Criando tabela de planos de pagamento...');
    await supabaseAdmin.rpc('exec_sql', {
      query: `
      -- Adicionando coluna name à tabela payment_plans se ela não existir
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'payment_plans' 
          AND column_name = 'name'
        ) THEN 
          ALTER TABLE payment_plans ADD COLUMN name text not null default 'Plano sem nome';
        END IF;
      END $$;

      create table if not exists payment_plans (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        student_id uuid not null,
        total_installments integer not null,
        installment_value decimal(10,2) not null,
        start_date date not null,
        end_date date not null,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null,
        constraint fk_student
          foreign key (student_id)
          references students (id)
      );

      alter table payment_plans enable row level security;

      drop policy if exists "Admins can view their payment plans" on payment_plans;
      create policy "Admins can view their payment plans"
        on payment_plans for select
        to authenticated
        using (
          exists (
            select 1 from administrators
            where user_id = auth.uid()
          )
        );

      drop policy if exists "Admins can manage their payment plans" on payment_plans;
      create policy "Admins can manage their payment plans"
        on payment_plans for all
        to authenticated
        using (
          exists (
            select 1 from administrators
            where user_id = auth.uid()
          )
        );
    `
    }).then(result => {
      if (result.error) {
        throw new Error(`Erro ao criar tabela payment_plans: ${result.error.message}`);
      }
      console.log('Tabela payment_plans criada com sucesso!');
    });

    // Criando tabela de parcelas
    console.log('Criando tabela de parcelas...');
    await supabaseAdmin.rpc('exec_sql', {
      query: `
      create table if not exists installments (
        id uuid primary key default gen_random_uuid(),
        payment_plan_id uuid not null,
        due_date date not null,
        value decimal(10,2) not null,
        status text not null check (status in ('paga', 'em_aberto', 'atrasada')),
        payment_date date,
        created_at timestamptz default now() not null,
        updated_at timestamptz default now() not null,
        constraint fk_payment_plan
          foreign key (payment_plan_id)
          references payment_plans (id)
          on delete cascade
      );

      alter table installments enable row level security;

      drop policy if exists "Admins can view their installments" on installments;
      create policy "Admins can view their installments"
        on installments for select
        to authenticated
        using (
          exists (
            select 1 from administrators
            where user_id = auth.uid()
          )
        );

      drop policy if exists "Admins can manage their installments" on installments;
      create policy "Admins can manage their installments"
        on installments for all
        to authenticated
        using (
          exists (
            select 1 from administrators
            where user_id = auth.uid()
          )
        );
    `
    }).then(result => {
      if (result.error) {
        throw new Error(`Erro ao criar tabela installments: ${result.error.message}`);
      }
      console.log('Tabela installments criada com sucesso!');
    });

    console.log('Todas as tabelas foram criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    throw error;
  }
};

export const setupDatabase = async () => {
  try {
    await createTables();
  } catch (error) {
    console.error('Erro ao configurar banco de dados:', error);
    throw error;
  }
};