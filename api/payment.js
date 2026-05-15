export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { plan, userId, userEmail, userName } = req.body

  const plans = {
    starter: { price: 49000, name: 'LamarCerdas Starter' },
    pro: { price: 199000, name: 'LamarCerdas Pro' },
  }

  const selectedPlan = plans[plan]
  if (!selectedPlan) return res.status(400).json({ error: 'Plan tidak valid.' })

  const orderId = `LC-${plan.toUpperCase()}-${userId.slice(0, 8)}-${Date.now()}`

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: selectedPlan.price,
    },
    customer_details: {
      email: userEmail,
      first_name: userName || 'User',
    },
    item_details: [{
      id: plan,
      price: selectedPlan.price,
      quantity: 1,
      name: selectedPlan.name,
    }],
    callbacks: {
  finish: 'https://lamarcerdas.my.id/dashboard?payment=success',
  error: 'https://lamarcerdas.my.id/pricing?payment=error',
  pending: 'https://lamarcerdas.my.id/dashboard?payment=pending',
}
  }

  try {
    const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64')
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (data.error_messages) throw new Error(data.error_messages[0])

    return res.status(200).json({ token: data.token, orderId })
  } catch (error) {
    console.error('Midtrans error:', error)
    return res.status(500).json({ error: 'Gagal membuat transaksi.' })
  }
}
