import { supabase } from '../lib/supabase';

type InventoryDeduction = {
  inventoryItemId?: string;
};

export const buildInventoryDeductions = (lines: InventoryDeduction[] = []) => {
  const quantities = new Map<string, number>();

  for (const line of lines) {
    if (!line.inventoryItemId) continue;
    quantities.set(line.inventoryItemId, (quantities.get(line.inventoryItemId) || 0) + 1);
  }

  return Array.from(quantities, ([inventoryItemId, quantity]) => ({
    inventoryItemId,
    quantity,
  }));
};

export const deductInventoryStock = async (
  garageId: string,
  lines: InventoryDeduction[] = []
) => {
  const deductions = buildInventoryDeductions(lines);

  for (const deduction of deductions) {
    const { data, error } = await supabase.rpc('deduct_inventory_stock', {
      p_garage_id: garageId,
      p_inventory_id: deduction.inventoryItemId,
      p_quantity: deduction.quantity,
    });

    if (error) throw error;
    if (data !== true) {
      throw new Error('Insufficient stock or inventory item not found for this garage.');
    }
  }
};
