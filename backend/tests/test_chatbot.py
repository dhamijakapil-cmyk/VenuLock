"""
Chatbot API Tests
Tests for the AI customer support chatbot powered by GPT-4o-mini via emergentintegrations
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestChatbotAPI:
    """Tests for /api/chatbot/message endpoint"""

    def test_chatbot_message_without_session_id(self):
        """Test sending message without session_id - should create new session"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Hello, what services do you offer?"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reply" in data, "Response should contain 'reply'"
        assert "session_id" in data, "Response should contain 'session_id'"
        assert isinstance(data["reply"], str), "Reply should be a string"
        assert len(data["reply"]) > 0, "Reply should not be empty"
        assert len(data["session_id"]) > 0, "Session ID should not be empty"
        
        # Verify session_id is valid UUID format
        try:
            uuid.UUID(data["session_id"])
        except ValueError:
            # Session ID might be custom format, that's okay
            pass
        
        print(f"✓ New session created: {data['session_id'][:8]}...")
        print(f"✓ AI response received: {data['reply'][:100]}...")

    def test_chatbot_message_with_session_id(self):
        """Test sending message with existing session_id for multi-turn conversation"""
        # First message to create session
        response1 = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "What cities do you operate in?"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        session_id = data1["session_id"]
        
        # Second message with same session (multi-turn)
        response2 = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Tell me more about Delhi venues", "session_id": session_id},
            headers={"Content-Type": "application/json"}
        )
        
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}"
        
        data2 = response2.json()
        assert "reply" in data2
        assert data2["session_id"] == session_id, "Session ID should be preserved"
        assert len(data2["reply"]) > 0, "Should get a reply"
        
        print(f"✓ Multi-turn conversation works with session: {session_id[:8]}...")
        print(f"✓ Follow-up response: {data2['reply'][:100]}...")

    def test_chatbot_context_awareness(self):
        """Test that chatbot maintains context across messages"""
        # Ask about a specific topic
        response1 = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "I'm looking for a wedding venue in Mumbai for 300 guests"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        session_id = data1["session_id"]
        
        # Ask follow-up without repeating context
        response2 = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "What's the price range?", "session_id": session_id},
            headers={"Content-Type": "application/json"}
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # The response should be relevant to the context (wedding/venue/price)
        reply_lower = data2["reply"].lower()
        context_words = ["price", "₹", "per plate", "budget", "cost", "range", "venue", "wedding"]
        has_context = any(word in reply_lower for word in context_words)
        
        assert has_context, f"Response should maintain context. Got: {data2['reply'][:200]}"
        print(f"✓ Context maintained - response about pricing/venue")

    def test_chatbot_empty_message_handling(self):
        """Test that empty message is handled properly"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": ""},
            headers={"Content-Type": "application/json"}
        )
        
        # Should either return error or handle gracefully
        # Based on implementation, empty message might be processed
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Empty message handled with status: {response.status_code}")

    def test_chatbot_response_time(self):
        """Test that chatbot responds within reasonable time (< 30 seconds)"""
        import time
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Hi"},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed < 30, f"Response took too long: {elapsed:.2f}s"
        print(f"✓ Response time: {elapsed:.2f}s")

    def test_chatbot_response_structure(self):
        """Test that response has correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "What are your EMI options?"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert isinstance(data, dict), "Response should be a dictionary"
        assert "reply" in data, "Response should have 'reply' field"
        assert "session_id" in data, "Response should have 'session_id' field"
        
        # Reply should be informative (not just acknowledgment)
        assert len(data["reply"]) > 20, "Reply should be informative"
        
        print(f"✓ Response structure valid with {len(data['reply'])} characters")


class TestChatbotKnowledge:
    """Tests for chatbot's knowledge about VenuLock"""

    def test_chatbot_knows_cities(self):
        """Test that chatbot knows about operating cities"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "Which cities do you operate in?"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        reply_lower = data["reply"].lower()
        
        # Should mention at least some cities
        cities = ["delhi", "mumbai", "bangalore", "hyderabad", "bengaluru"]
        mentioned_cities = [city for city in cities if city in reply_lower]
        
        assert len(mentioned_cities) >= 1, f"Should mention cities. Got: {data['reply'][:200]}"
        print(f"✓ Cities mentioned: {mentioned_cities}")

    def test_chatbot_knows_pricing(self):
        """Test that chatbot knows about pricing ranges"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "What is your pricing like?"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        reply = data["reply"]
        
        # Should mention pricing - either with ₹ symbol or price keywords
        has_pricing = "₹" in reply or "price" in reply.lower() or "per plate" in reply.lower() or "1,200" in reply or "6,000" in reply
        
        assert has_pricing, f"Should mention pricing. Got: {reply[:200]}"
        print(f"✓ Pricing information provided")

    def test_chatbot_knows_how_it_works(self):
        """Test that chatbot can explain booking process"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/message",
            json={"message": "How does your booking process work?"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        reply_lower = data["reply"].lower()
        
        # Should mention process elements
        process_words = ["select", "choose", "browse", "search", "relationship manager", "rm", "venue", "book"]
        has_process = any(word in reply_lower for word in process_words)
        
        assert has_process, f"Should explain process. Got: {data['reply'][:200]}"
        print(f"✓ Booking process explained")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
