create or replace function public.deduct_inventory_stock(
  p_garage_id uuid,
  p_inventory_id uuid,
  p_quantity integer default 1
)
returns boolean
language plpgsql
security invoker
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  update public.inventory
  set stock_quantity = stock_quantity - p_quantity
  where id = p_inventory_id
    and garage_id = p_garage_id
    and stock_quantity >= p_quantity;

  return found;
end;
$$;
