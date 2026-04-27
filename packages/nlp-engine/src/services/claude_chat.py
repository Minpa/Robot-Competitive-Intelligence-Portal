import os
from anthropic import Anthropic
from typing import List, Dict, Any

class ClaudeChatService:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-opus-4-6"

    def send_message(self, messages: List[Dict[str, str]], max_tokens: int = 1000) -> str:
        """
        Claude와 채팅 메시지를 주고받음
        """
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=messages
            )
            return response.content[0].text
        except Exception as e:
            raise Exception(f"Claude API error: {str(e)}")

    def generate_response(self, user_message: str, context: str = "") -> str:
        """
        사용자 메시지에 대한 응답 생성
        """
        system_prompt = f"""You are Claude, a helpful AI assistant specialized in robotics and competitive intelligence.
        {context}
        Provide helpful, accurate, and concise responses."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        return self.send_message(messages)