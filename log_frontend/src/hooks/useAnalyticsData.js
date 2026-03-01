import { useState, useEffect } from 'react'

export function useAnalyticsData() {

  // ✅ Safe initial structure (prevents null crash)
  const [data, setData] = useState({
    overview: {},
    requests_per_ip: [],
    status_distribution: [],
    top_endpoints: [],
    method_distribution: [],
    hourly_traffic: [],
    daily_traffic: [],
    bandwidth_by_ip: [],
    anomalies: []
  })

  const [liveLog, setLiveLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/analytics")

      if (!response.ok) {
        throw new Error("Failed to fetch analytics")
      }

      const result = await response.json()

      // ✅ Extra safety: ensure anomalies exists
      setData({
        ...result,
        anomalies: result.anomalies || []
      })

      setLoading(false)

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/logs")

    ws.onopen = () => {
      console.log("WebSocket connected")
    }

    ws.onmessage = (event) => {
      const log = JSON.parse(event.data)
      setLiveLog(prev => [log, ...prev].slice(0, 50))
    }

    ws.onerror = (err) => {
      console.error("WebSocket error:", err)
    }

    ws.onclose = () => {
      console.log("WebSocket disconnected")
    }

    return () => ws.close()
  }, [])

  return { data, liveLog, loading, error }
}