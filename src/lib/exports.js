import { downloadCSV, fetchAll } from './csv'
import { supabase } from './supabaseClient'
import { goatLabel } from './format'
import { todayISO } from './dateRanges'

// Column definitions shared by the list pages and the Reports page.

const inRange = (query, column, from, to) => (from && to ? query.gte(column, from).lte(column, to) : query)
const suffix = (from, to) => (from && to ? `${from}_to_${to}` : `all_${todayISO()}`)

export const exporters = {
  goats: {
    label: 'Goats',
    dated: false,
    load: () =>
      fetchAll(() =>
        supabase
          .from('goats')
          .select('*, mother:goats!goats_mother_id_fkey(tag_id), father:goats!goats_father_id_fkey(tag_id)')
          .order('tag_id')
      ),
    save: (rows) =>
      downloadCSV(`goats_${todayISO()}.csv`, rows, [
        { label: 'Tag', value: (r) => r.tag_id },
        { label: 'Name', value: (r) => r.name },
        { label: 'Breed', value: (r) => r.breed },
        { label: 'Sex', value: (r) => r.sex },
        { label: 'Date of birth', value: (r) => r.date_of_birth },
        { label: 'Colour', value: (r) => r.color },
        { label: 'Mother', value: (r) => r.mother?.tag_id },
        { label: 'Father', value: (r) => r.father?.tag_id },
        { label: 'Status', value: (r) => r.status },
        { label: 'Source', value: (r) => r.source },
        { label: 'Acquired', value: (r) => r.acquired_date },
        { label: 'Notes', value: (r) => r.notes },
      ]),
  },
  health: {
    label: 'Health records',
    dated: true,
    load: (from, to) =>
      fetchAll(() =>
        inRange(supabase.from('health_records').select('*, goats(tag_id, name)'), 'record_date', from, to).order('record_date', {
          ascending: false,
        })
      ),
    save: (rows, from, to) =>
      downloadCSV(`health_${suffix(from, to)}.csv`, rows, [
        { label: 'Date', value: (r) => r.record_date },
        { label: 'Goat', value: (r) => goatLabel(r.goats) },
        { label: 'Type', value: (r) => r.record_type },
        { label: 'Title', value: (r) => r.title },
        { label: 'Next due', value: (r) => r.next_due_date },
        { label: 'Cost (INR)', value: (r) => r.cost },
        { label: 'Notes', value: (r) => r.notes },
      ]),
  },
  breeding: {
    label: 'Breeding records',
    dated: true,
    load: (from, to) =>
      fetchAll(() =>
        inRange(
          supabase
            .from('breeding_records')
            .select('*, doe:goats!breeding_records_doe_id_fkey(tag_id, name), buck:goats!breeding_records_buck_id_fkey(tag_id, name)'),
          'mating_date',
          from,
          to
        ).order('mating_date', { ascending: false })
      ),
    save: (rows, from, to) =>
      downloadCSV(`breeding_${suffix(from, to)}.csv`, rows, [
        { label: 'Doe', value: (r) => goatLabel(r.doe) },
        { label: 'Buck', value: (r) => (r.buck ? goatLabel(r.buck) : r.buck_name) },
        { label: 'Mating date', value: (r) => r.mating_date },
        { label: 'Expected kidding', value: (r) => r.expected_kidding_date },
        { label: 'Actual kidding', value: (r) => r.actual_kidding_date },
        { label: 'Kids', value: (r) => r.number_of_kids },
        { label: 'Outcome', value: (r) => r.outcome },
        { label: 'Notes', value: (r) => r.notes },
      ]),
  },
  weight: {
    label: 'Weight records',
    dated: true,
    load: (from, to) =>
      fetchAll(() =>
        inRange(supabase.from('weight_records').select('*, goats(tag_id, name)'), 'record_date', from, to).order('record_date', {
          ascending: false,
        })
      ),
    save: (rows, from, to) =>
      downloadCSV(`weight_${suffix(from, to)}.csv`, rows, [
        { label: 'Date', value: (r) => r.record_date },
        { label: 'Goat', value: (r) => goatLabel(r.goats) },
        { label: 'Weight (kg)', value: (r) => r.weight_kg },
        { label: 'Notes', value: (r) => r.notes },
      ]),
  },
  milk: {
    label: 'Milk records',
    dated: true,
    load: (from, to) =>
      fetchAll(() =>
        inRange(supabase.from('milk_records').select('*, goats(tag_id, name)'), 'record_date', from, to)
          .order('record_date', { ascending: false })
          .order('session', { ascending: true })
      ),
    save: (rows, from, to) =>
      downloadCSV(`milk_${suffix(from, to)}.csv`, rows, [
        { label: 'Date', value: (r) => r.record_date },
        { label: 'Session', value: (r) => r.session },
        { label: 'Goat', value: (r) => goatLabel(r.goats) },
        { label: 'Litres', value: (r) => r.litres },
        { label: 'Notes', value: (r) => r.notes },
      ]),
  },
  expenses: {
    label: 'Expenses',
    dated: true,
    load: (from, to) =>
      fetchAll(() => inRange(supabase.from('expenses').select('*'), 'expense_date', from, to).order('expense_date', { ascending: false })),
    save: (rows, from, to) =>
      downloadCSV(`expenses_${suffix(from, to)}.csv`, rows, [
        { label: 'Date', value: (r) => r.expense_date },
        { label: 'Category', value: (r) => r.category },
        { label: 'Description', value: (r) => r.description },
        { label: 'Amount (INR)', value: (r) => r.amount },
      ]),
  },
  sales: {
    label: 'Sales',
    dated: true,
    load: (from, to) =>
      fetchAll(() =>
        inRange(supabase.from('sales').select('*, goats(tag_id, name)'), 'sale_date', from, to).order('sale_date', { ascending: false })
      ),
    save: (rows, from, to) =>
      downloadCSV(`sales_${suffix(from, to)}.csv`, rows, [
        { label: 'Date', value: (r) => r.sale_date },
        { label: 'Type', value: (r) => r.sale_type },
        { label: 'Goat', value: (r) => (r.goats ? goatLabel(r.goats) : '') },
        { label: 'Quantity', value: (r) => r.quantity },
        { label: 'Buyer', value: (r) => r.buyer_name },
        { label: 'Buyer contact', value: (r) => r.buyer_contact },
        { label: 'Amount (INR)', value: (r) => r.amount },
        { label: 'Notes', value: (r) => r.notes },
      ]),
  },
}
