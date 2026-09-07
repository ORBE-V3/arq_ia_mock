from dataclasses import dataclass

@dataclass(frozen=True)
class Identity:
    user_id:str='demo-ana'
    workspace_id:str='studio-demo'
    display_name:str='Ana Martins'

def current_identity()->Identity:
    """Demo only. Replace with verified OIDC/SSO claims and tenant authorization."""
    return Identity()
